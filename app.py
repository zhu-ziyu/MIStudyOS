"""宓语 StudyOS: a native Windows desktop window with an embedded UI engine.

Run app.py, or build the desktop executable with MiStudyOS.spec. No Node.js or
external browser is required by the desktop application.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
from pathlib import Path
import subprocess
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit


ROOT = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
APP_DIR = Path(sys.executable).resolve().parent if getattr(sys, "frozen", False) else ROOT
DATA_DIR = APP_DIR / ".studyos-data"


class AssetHandler(SimpleHTTPRequestHandler):
    """Serve bundled UI files inside this process, restricted to its assets."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        parts = Path(unquote(urlsplit(self.path).path)).parts
        if any(part.startswith(".") for part in parts):
            self.send_error(403)
            return
        allowed = ("/src/", "/assets/", "/resource-packs/", "/config/")
        route = urlsplit(self.path).path
        if route not in ("/", "/index.html") and not route.startswith(allowed):
            self.send_error(404)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store" if self.path.startswith(("/src/", "/config/")) else "private, max-age=3600")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def log_message(self, *_):
        pass


class DesktopAPI:
    """Small explicit native bridge; no arbitrary execution/file-path API."""
    def __init__(self):
        self._lock = threading.Lock()
        self._legacy_process = None

    def _config(self):
        config_path = APP_DIR / "config" / "studyos.json"
        if not config_path.exists():
            config_path = ROOT / "config" / "studyos.json"
        return json.loads(config_path.read_text(encoding="utf-8"))

    def get_app_info(self):
        entry = self._config().get("writingStudio", {}).get("entryPath")
        return {"name": "宓语 StudyOS", "mode": "desktop", "nativeWritingStudio": bool(entry)}

    def get_preferences(self):
        prefs = DATA_DIR / "preferences.json"
        try:
            return json.loads(prefs.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return {}

    def save_preferences(self, values):
        if not isinstance(values, dict):
            return False
        clean = {"name": str(values.get("name", "Sam"))[:16], "motion": bool(values.get("motion", True)), "intro": bool(values.get("intro", True))}
        with self._lock:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            target = DATA_DIR / "preferences.json"
            temporary = target.with_suffix(".tmp")
            temporary.write_text(json.dumps(clean, ensure_ascii=False, indent=2), encoding="utf-8")
            temporary.replace(target)
        return True

    def launch_writing_studio(self):
        settings = self._config().get("writingStudio", {})
        entry_value = settings.get("entryPath")
        if not entry_value:
            return {"ok": False, "message": "原写作项目尚未接入。"}
        entry = Path(entry_value).expanduser().resolve()
        if not entry.is_file():
            return {"ok": False, "message": "没有找到配置的原写作程序。"}
        if entry.suffix.lower() not in (".py", ".pyw", ".exe"):
            return {"ok": False, "message": "写作入口应是原 Python 程序或 EXE。"}
        if self._legacy_process and self._legacy_process.poll() is None:
            return {"ok": True, "message": "写作工坊已经打开。"}
        if entry.suffix.lower() == ".exe":
            command = [str(entry)]
        else:
            interpreter = settings.get("pythonExecutable")
            if not interpreter and getattr(sys, "frozen", False):
                return {"ok": False, "message": "请在接入配置中指定原写作项目的 Python 解释器。"}
            command = [interpreter or sys.executable, str(entry)]
        try:
            self._legacy_process = subprocess.Popen(command, cwd=entry.parent, creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
            return {"ok": True, "message": "墨笺·宓语已打开。"}
        except OSError:
            return {"ok": False, "message": "原写作程序启动失败，请检查入口与解释器配置。"}


def capture_native_preview(window, output):
    """QA export directly from this application's own WebView2 renderer."""
    from System import Func, Object
    from System.IO import FileStream, FileMode, FileAccess
    from Microsoft.Web.WebView2.Core import CoreWebView2CapturePreviewImageFormat
    output.parent.mkdir(parents=True, exist_ok=True)
    stream = FileStream(str(output), FileMode.Create, FileAccess.Write)
    try:
        control = window.native.browser.webview
        task = control.Invoke(Func[Object](lambda: control.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png, stream)))
        assert task.Wait(10000), "Native preview capture timed out"
    finally:
        stream.Dispose()


def main():
    parser = argparse.ArgumentParser(description="宓语 StudyOS 桌面软件")
    parser.add_argument("--debug", action="store_true")
    parser.add_argument("--smoke-test", action="store_true", help="Open native engine, verify the UI and close automatically.")
    parser.add_argument("--animation-test", action="store_true", help="Capture intermediate intro and eye frames in the native engine.")
    args = parser.parse_args()
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(filename=DATA_DIR / "desktop.log", encoding="utf-8", level=logging.INFO)
    try:
        import webview
    except ImportError:
        message = "请先运行 setup-desktop.ps1 安装桌面运行环境，或打开打包后的 MiStudyOS.exe。"
        if os.name == "nt":
            import ctypes
            ctypes.windll.user32.MessageBoxW(None, message, "宓语 StudyOS", 0x10)
        raise SystemExit(message)

    server = ThreadingHTTPServer(("127.0.0.1", 0), AssetHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f"http://127.0.0.1:{server.server_address[1]}"
    api = DesktopAPI()
    window = webview.create_window("宓语 StudyOS", origin, js_api=api, width=1500, height=882, min_size=(1100, 660), resizable=True, background_color="#F6F5F2", text_select=True)
    smoke_result = {}

    def verify_native():
        if not (args.smoke_test or args.animation_test):
            return
        try:
            deadline = time.monotonic() + 35
            while time.monotonic() < deadline:
                result = window.evaluate_js("Boolean(window.studyos)")
                if result:
                    break
                time.sleep(.15)
            assert result, "UI did not initialize"
            window.evaluate_js("window.studyos.finishIntro()")
            state = window.evaluate_js("({title:document.title, modules:document.querySelectorAll('.module-button').length, native:!!window.pywebview.api, duplicateDialogText:document.querySelectorAll('.dialog-cn').length})")
            assert state["modules"] == 10
            assert state["native"] is True
            assert state["duplicateDialogText"] == 1
            frame = window.evaluate_js("(()=>{const r=document.getElementById('home-stage').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight}})()")
            assert frame["left"] >= -1 and frame["right"] <= frame["width"] + 1, "Stage cropped horizontally"
            assert frame["top"] >= -1 and frame["bottom"] <= frame["height"] + 1, "Stage cropped vertically"
            if args.animation_test:
                captures = []
                for milliseconds in (0, 900, 1500, 2300, 3000, 3400, 3900, 4500, 4800, 5300, 5700, 6100, 6800):
                    window.evaluate_js(f"window.studyos.seekIntro({milliseconds})")
                    time.sleep(.06)
                    name = f"intro-{milliseconds:04d}.png"
                    capture_native_preview(window, APP_DIR / "artifacts" / "animation" / name)
                    captures.append(name)
                window.evaluate_js("window.studyos.finishIntro()")
                for amount in (0, .5, 1):
                    window.evaluate_js(f"window.studyos.seekBlink({amount})")
                    time.sleep(.06)
                    capture_native_preview(window, APP_DIR / "artifacts" / "animation" / f"blink-{amount:g}.png")
                window.evaluate_js("window.studyos.replayIntro(); window.studyos.finishIntro(); window.studyos.replayIntro(); window.studyos.finishIntro()")
                clean = window.evaluate_js("window.studyos.getState()")
                assert not clean["introRunning"] and clean["scene"]["complete"] and clean["character"]["blink"] == 0
                window.evaluate_js("""(()=>{
                    window.studyos.replayIntro(); window.__studyosFrames=[];
                    let previous=performance.now(), until=previous+3200;
                    function sample(now){window.__studyosFrames.push(now-previous);previous=now;if(now<until)requestAnimationFrame(sample);}
                    requestAnimationFrame(sample);
                })()""")
                time.sleep(3.4)
                samples = window.evaluate_js("window.__studyosFrames")
                samples = sorted(samples[3:])
                assert len(samples) > 30, "Intro did not render continuously"
                performance = {"frames": len(samples), "medianFrameMs": round(samples[len(samples)//2], 2), "p95FrameMs": round(samples[int(len(samples)*.95)], 2)}
                assert performance["p95FrameMs"] < 50, "Intro rendering has repeated frame stalls"
                window.evaluate_js("window.studyos.finishIntro()")
                window.evaluate_js("window.studyos.seekIntro(325, true)")
                assert window.evaluate_js("getComputedStyle(document.querySelector('.module-group')).opacity") == '0.5'
                window.evaluate_js("window.studyos.finishIntro()")
                smoke_result.update({"animationFrames": captures, "genuineInkStrokes": clean["scene"]["tracedStrokes"], "blinkRegistrationInliers": clean["character"]["registrationInliers"], "continuousMesh": clean["scene"]["continuousMesh"], "replaySkipClean": True, "reducedMotionFade": True, "performance": performance})
            window.evaluate_js("document.getElementById('home-stage').classList.add('motion-off')")
            window.evaluate_js("window.studyos.seekBlink(0)")
            time.sleep(.4)
            capture_native_preview(window, APP_DIR / "artifacts" / "desktop-native-home.png")
            window.evaluate_js("window.studyos.openModule('writing')")
            assert window.evaluate_js("document.getElementById('module-dialog').open")
            capture_native_preview(window, APP_DIR / "artifacts" / "desktop-native-writing.png")
            window.evaluate_js("document.getElementById('module-dialog').close()")
            smoke_result.update({"passed": True, "engine": "Windows WebView2", "window": "native desktop", "full_frame_visible": True, **state})
        except Exception as error:
            smoke_result.update({"passed": False, "error": str(error)})
            logging.exception("Native smoke test failed")
        finally:
            (APP_DIR / "artifacts").mkdir(exist_ok=True)
            (APP_DIR / "artifacts" / "desktop-verification.json").write_text(json.dumps(smoke_result, ensure_ascii=False, indent=2), encoding="utf-8")
            print(json.dumps(smoke_result, ensure_ascii=False), flush=True)
            window.destroy()

    try:
        qa = args.smoke_test or args.animation_test
        webview.start(verify_native if qa else None, gui="edgechromium", debug=args.debug, private_mode=False, storage_path=str(DATA_DIR / ("qa-webview" if qa else "webview")))
    finally:
        server.shutdown()
        server.server_close()
    if (args.smoke_test or args.animation_test) and not smoke_result.get("passed"):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
