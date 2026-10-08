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
        if route in ("/", "/index.html"):
            # Deliver local settings with the shell, without serial config or
            # native-bridge round trips on the first visible frame.
            api = DesktopAPI()
            try:
                config = api._config()
            except (OSError, ValueError):
                config = {"writingStudio": {"url": None, "mode": "embedded"}}
            bootstrap = json.dumps({"config": config, "preferences": api.get_preferences()}, ensure_ascii=False).replace("<", "\\u003c")
            html = (ROOT / "index.html").read_text(encoding="utf-8").replace('<script type="module"', '<script>window.__STUDYOS_BOOT__=' + bootstrap + ';</script><script type="module"', 1)
            body = html.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store" if self.path.startswith(("/src/", "/config/")) or urlsplit(self.path).path in ("/", "/index.html") else "private, max-age=86400")
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
        clean = {"name": str(values.get("name", "Sam"))[:16], "motion": bool(values.get("motion", True)), "intro": bool(values.get("intro", True)), "companion": bool(values.get("companion", True))}
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
    parser.add_argument("--companion-test", action="store_true", help="Verify local dialogue and talking poses in the native engine.")
    parser.add_argument("--performance-test", action="store_true", help="Measure startup and actual rendered frame intervals.")
    args = parser.parse_args()
    launch_clock = time.perf_counter()
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

    # A stable local origin lets WebView2 reuse decoded/cacheable artwork on
    # later launches. A second instance gets an independent ephemeral port.
    try:
        server = ThreadingHTTPServer(("127.0.0.1", 41737), AssetHandler)
    except OSError:
        server = ThreadingHTTPServer(("127.0.0.1", 0), AssetHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f"http://127.0.0.1:{server.server_address[1]}"
    api = DesktopAPI()
    window = webview.create_window("宓语 StudyOS", origin, js_api=api, width=1500, height=882, min_size=(1100, 660), resizable=True, background_color="#F6F5F2", text_select=True)
    smoke_result = {}

    def verify_native():
        if not (args.smoke_test or args.animation_test or args.performance_test or args.companion_test):
            return
        try:
            deadline = time.monotonic() + 35
            while time.monotonic() < deadline:
                result = window.evaluate_js("Boolean(window.studyos && document.body.dataset.host === 'desktop')")
                if result:
                    break
                time.sleep(.15)
            assert result, "UI did not initialize"
            if args.performance_test:
                startup = {"nativeReadyMs": round((time.perf_counter()-launch_clock)*1000,1), "frontendReadyMs": window.evaluate_js("Math.round(performance.now())"), "firstVisiblePaintMs": window.evaluate_js("Math.round(performance.getEntriesByType('paint').find(p=>p.name==='first-contentful-paint')?.startTime || 0)"), "launchIntroMs": window.evaluate_js("window.studyos.getState().scene.duration")}
                window.evaluate_js("""(()=>{
                    window.__renderSamples=[];
                    const original=CanvasRenderingContext2D.prototype.drawImage;
                    CanvasRenderingContext2D.prototype.drawImage=function(...args){
                        const out=original.apply(this,args);
                        if(this.canvas.classList.contains('scene-canvas')&&this.globalCompositeOperation==='destination-in')window.__renderSamples.push(performance.now());
                        return out;
                    };
                    window.studyos.replayIntro();
                })()""")
                duration = window.evaluate_js("window.studyos.getState().scene.duration || 6800")
                time.sleep(duration/1000+.25)
                measured = window.evaluate_js("window.studyos.getState().scene.performance || {timestamps:window.__renderSamples}")
                stamps = measured.get("timestamps", [])
                intervals = sorted([b-a for a,b in zip(stamps,stamps[1:]) if b-a>0][3:])
                assert len(intervals)>20, "Actual render frames were not recorded"
                performance = {"renderedFrames":len(stamps),"medianRenderIntervalMs":round(intervals[len(intervals)//2],2),"p95RenderIntervalMs":round(intervals[int(len(intervals)*.95)],2),"stallsOver50ms":sum(interval>50 for interval in intervals)}
                report = {"startup":startup,"playback":performance,"state":window.evaluate_js("window.studyos.getState()")}
                (APP_DIR / "artifacts").mkdir(exist_ok=True)
                (APP_DIR / "artifacts" / "native-performance.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
                smoke_result.update({"passed":True,"performance":performance,"startup":startup})
                return
            window.evaluate_js("window.studyos.finishIntro()")
            state = window.evaluate_js("({title:document.title, modules:document.querySelectorAll('.module-button').length, native:!!window.pywebview.api, duplicateDialogText:document.querySelectorAll('.dialog-cn').length})")
            assert state["modules"] == 10
            assert state["native"] is True
            assert state["duplicateDialogText"] == 1
            frame = window.evaluate_js("(()=>{const r=document.getElementById('home-stage').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight}})()")
            assert frame["left"] >= -1 and frame["right"] <= frame["width"] + 1, "Stage cropped horizontally"
            assert frame["top"] >= -1 and frame["bottom"] <= frame["height"] + 1, "Stage cropped vertically"
            if args.companion_test:
                assert window.evaluate_js("window.studyos.getState().scene.continuousMesh"), "Speech renderer unavailable"
                probes = [[876, 281], [870, 285], [883, 277], [877, 261], [895, 304], [807, 264], [928, 357]]
                baseline = None
                for amount in (0, .5, 1, 0):
                    window.evaluate_js(f"window.studyos.seekTalk({amount})")
                    pixels = window.evaluate_js(f"window.studyos.inspectScenePixels({json.dumps(probes)})")
                    if baseline is None:
                        baseline = pixels
                    elif amount == 0:
                        assert pixels == baseline, "Closed speech did not restore original face"
                    else:
                        assert pixels[:3] != baseline[:3], "Mouth did not open"
                        assert pixels[3:] == baseline[3:], "Speech changed nose, eyes or hand"
                    capture_native_preview(window, APP_DIR / "artifacts" / "companion" / f"mouth-{amount:g}.png")
                    window.evaluate_js("""(()=>{
                        window.studyos.inspectScenePixels([]);
                        const zoom=document.createElement('canvas');zoom.id='qa-mouth-zoom';zoom.width=720;zoom.height=480;
                        zoom.style.cssText='position:fixed;left:0;top:0;z-index:9999;width:720px;height:480px;background:#f6f5f2';
                        const c=zoom.getContext('2d');c.fillStyle='#f6f5f2';c.fillRect(0,0,720,480);
                        c.drawImage(document.querySelector('.scene-mesh'),820,254,120,80,0,0,720,480);
                        document.body.append(zoom);
                    })()""")
                    capture_native_preview(window, APP_DIR / "artifacts" / "companion" / f"mouth-zoom-{amount:g}.png")
                    window.evaluate_js("document.getElementById('qa-mouth-zoom').remove()")
                window.evaluate_js("window.studyos.finishIntro()")
                # QA clicks are synthetic; activate our own window first so
                # the same focus/resume path runs as a real desktop click.
                from System import Func, Object
                def focus_qa_window():
                    window.native.Activate()
                    return window.native.browser.webview.Focus()
                window.native.Invoke(Func[Object](focus_qa_window))
                time.sleep(.3)
                window.evaluate_js("document.querySelector('.character-hit').click()")
                dialogue = window.evaluate_js("window.studyos.getState().companion")
                assert dialogue["text"] == "你是来学习的，不是来戳我的。", "First character click has wrong persona"
                assert dialogue["speaking"], f"Character click did not start talking: {window.evaluate_js('({character:window.studyos.getState().character,focus:document.hasFocus(),hidden:document.hidden})')}"
                mouth_samples = []
                for _ in range(12):
                    time.sleep(.09)
                    mouth_samples.append(window.evaluate_js("window.studyos.getState().character.mouth"))
                assert max(mouth_samples) > .4 and min(mouth_samples) < .1, "Speech has no syllables or pauses"
                assert window.evaluate_js("window.studyos.pokeCharacter()") is False, "Fast clicks queued another utterance"
                capture_native_preview(window, APP_DIR / "artifacts" / "companion" / "speaking.png")
                duration = window.evaluate_js("window.studyos.getState().character.speechDuration")
                time.sleep(duration/1000)
                assert window.evaluate_js("window.studyos.getState().character.mouth") == 0
                assert not window.evaluate_js("window.studyos.getState().companion.speaking")
                window.evaluate_js("window.studyos.previewCompanion('idle'); window.studyos.openModule('course')")
                paused = window.evaluate_js("window.studyos.getState().companion")
                assert paused["suspended"] and not paused["speaking"] and not paused["typing"] and not paused["scheduled"]
                window.evaluate_js("document.getElementById('module-dialog').close(); window.studyos.previewCompanion('idle'); document.getElementById('home-search').focus()")
                assert not window.evaluate_js("window.studyos.getState().companion.scheduled"), "Reminders continued while searching"
                assert not window.evaluate_js("window.studyos.getState().companion.speaking"), "Active reminder interrupted editing"
                window.evaluate_js("document.getElementById('home-search').blur(); document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))")
                window.native.Invoke(Func[Object](focus_qa_window))
                window.evaluate_js("document.querySelector('.character-hit').focus()")
                time.sleep(.15)
                resumed = window.evaluate_js("({focus:document.hasFocus(),state:window.studyos.getState().companion})")
                # A background QA process cannot always claim OS foreground
                # focus. It must stay quiet in that case, exactly like the app.
                assert resumed["state"]["scheduled"] == resumed["focus"], f"Reminder focus guard is inconsistent: {resumed}"
                window.evaluate_js("document.getElementById('toggle-motion').click(); document.querySelector('.mi-dialog').click()")
                still = window.evaluate_js("window.studyos.getState()")
                assert not still["motion"] and not still["character"]["speaking"] and still["character"]["mouth"] == 0
                assert window.evaluate_js("document.querySelector('.dialog-cn').textContent") == still["companion"]["text"]
                window.evaluate_js("document.getElementById('toggle-motion').click()")
                smoke_result.update({"localDialogue": True, "persona": dialogue["persona"], "firstClick": dialogue["text"], "speechPulses": True,
                    "closedFaceRestored": True, "onlyLipAreaChanged": True, "clickCooldown": True, "pausedOnModuleAndSearch": True,
                    "reminderFocusGuard": True, "nativeReturnFocused": resumed["focus"], "staticDialogue": True})
            if args.animation_test:
                deadline = time.monotonic() + 10
                while not window.evaluate_js("window.studyos.getState().character.eyesReady") and time.monotonic() < deadline:
                    time.sleep(.1)
                assert window.evaluate_js("window.studyos.getState().character.eyesReady"), "Eye art did not load"
                captures = []
                for milliseconds in (0, 850, 1300, 1800, 2400, 3100, 3800, 4200, 4600, 4850, 5400, 6050, 6850, 7650, 8350, 8980, 9640, 10280, 10880, 11300):
                    window.evaluate_js(f"window.studyos.seekIntro({milliseconds})")
                    time.sleep(.06)
                    name = f"intro-{milliseconds:04d}.png"
                    capture_native_preview(window, APP_DIR / "artifacts" / "animation" / name)
                    captures.append(name)
                # Check the visible hierarchy, not just the total duration.
                # New controls must stay absent until the preceding act settles.
                for milliseconds, visible, absent in (
                    (4850, (), ("course", "writing", "daily", "grades")),
                    (5740, ("course", "writing"), ("calendar", "exam", "daily")),
                    (8300, ("course", "calendar", "assignment", "flashcards", "writing", "exam", "inbox", "originality"), ("daily", "grades")),
                    (9070, ("daily",), ("grades",)),
                    (9720, ("daily", "grades"), ()),
                ):
                    window.evaluate_js(f"window.studyos.seekIntro({milliseconds})")
                    opacity = window.evaluate_js("Object.fromEntries([...document.querySelectorAll('[data-module]')].map(n=>[n.dataset.module,Number(getComputedStyle(n).opacity)]))")
                    assert all(opacity[item] > .99 for item in visible), f"Act did not settle at {milliseconds}"
                    assert all(opacity[item] < .001 for item in absent), f"Acts overlapped at {milliseconds}"
                # Read actual GPU pixels: no enclosure may leak through a wing
                # mask, and all of its sides must arrive as one closed frame.
                fields = json.loads((ROOT / 'src/data/scene-fields.json').read_text(encoding='utf-8'))
                core_points = fields['enclosureProbes']
                window.evaluate_js("window.studyos.seekIntro(8350)")
                pixels = window.evaluate_js(f"window.studyos.inspectScenePixels({json.dumps(core_points)})")
                assert all(pixel[3] == 0 for pixel in pixels), "Central frame leaked before its act"
                window.evaluate_js("window.studyos.seekIntro(9070)")
                pixels = window.evaluate_js(f"window.studyos.inspectScenePixels({json.dumps(core_points)})")
                assert all(pixel[3] > 60 for pixel in pixels), "Central enclosure was cut into pieces"
                for x,y,arrival in fields['strokeProbes']:
                    window.evaluate_js(f"window.studyos.seekIntro({arrival-180})")
                    before = window.evaluate_js(f"window.studyos.inspectScenePixels([[{x},{y}]])[0][3]")
                    window.evaluate_js(f"window.studyos.seekIntro({arrival+180})")
                    after = window.evaluate_js(f"window.studyos.inspectScenePixels([[{x},{y}]])[0][3]")
                    assert before < after and after > 15, "Ink did not advance along traced contours"
                fill_probe = json.dumps([fields['fillProbe']])
                window.evaluate_js("window.studyos.seekIntro(3800)")
                assert window.evaluate_js(f"window.studyos.inspectScenePixels({fill_probe})[0][3]") < 2, "Shading appeared during the line-art pass"
                window.evaluate_js("window.studyos.seekIntro(4700)")
                assert window.evaluate_js(f"window.studyos.inspectScenePixels({fill_probe})[0][3]") > 60, "Ink shading did not fill after the contours"
                smoke_result.update({"enclosureNoLeaks": True, "completeEnclosure": True, "tracedInkProgress": True, "lineArtBeforeShading": True})
                window.evaluate_js("window.studyos.seekIntro(9720)")
                assert window.evaluate_js("Number(getComputedStyle(document.querySelector('.topbar')).opacity)") == 0, "Search appeared during the card act"
                window.evaluate_js("window.studyos.seekIntro(10470)")
                assert window.evaluate_js("Number(getComputedStyle(document.querySelector('.mi-dialog')).opacity)") == 0, "Welcome appeared before the room settled"
                window.evaluate_js("window.studyos.finishIntro()")
                for amount in (0, .5, 1):
                    window.evaluate_js(f"window.studyos.seekBlink({amount})")
                    time.sleep(.06)
                    capture_native_preview(window, APP_DIR / "artifacts" / "animation" / f"blink-{amount:g}.png")
                window.evaluate_js("window.studyos.replayIntro(); window.studyos.finishIntro(); window.studyos.replayIntro(); window.studyos.finishIntro()")
                clean = window.evaluate_js("window.studyos.getState()")
                assert not clean["introRunning"] and clean["scene"]["complete"] and clean["character"]["blink"] == 0
                window.evaluate_js("window.studyos.replayIntro()")
                time.sleep(3.4)
                timestamps = window.evaluate_js("window.studyos.getState().scene.performance.timestamps")
                samples = sorted([b-a for a,b in zip(timestamps,timestamps[1:])][3:])
                assert len(samples) > 30, "Intro did not render continuously"
                performance = {"frames": len(samples), "medianFrameMs": round(samples[len(samples)//2], 2), "p95FrameMs": round(samples[int(len(samples)*.95)], 2)}
                assert performance["p95FrameMs"] < 50, "Intro rendering has repeated frame stalls"
                window.evaluate_js("window.studyos.finishIntro()")
                window.evaluate_js("""(()=>{
                    const stage=document.getElementById('home-stage'),r=stage.getBoundingClientRect();
                    stage.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+r.width*.92,clientY:r.top+r.height*.3}));
                })()""")
                time.sleep(.45)
                assert window.evaluate_js("window.studyos.getState().scene.gaze[0]") > .55, "Character did not respond to pointer"
                window.evaluate_js("window.studyos.openModule('course')")
                paused = window.evaluate_js("window.studyos.getState().scene.performance.idleTimestamps.at(-1)")
                time.sleep(.2)
                assert window.evaluate_js("window.studyos.getState().scene.performance.idleTimestamps.at(-1)") == paused, "Idle drawing continued behind a dialog"
                window.evaluate_js("document.getElementById('module-dialog').close()")
                window.evaluate_js("window.studyos.seekIntro(325, true)")
                assert window.evaluate_js("getComputedStyle(document.querySelector('.module-group')).opacity") == '0.5'
                window.evaluate_js("window.studyos.finishIntro()")
                smoke_result.update({"animationFrames": captures, "orderedActs": True, "genuineInkStrokes": clean["scene"]["tracedStrokes"], "blinkRegistrationInliers": clean["character"]["registrationInliers"], "continuousMesh": clean["scene"]["continuousMesh"], "replaySkipClean": True, "reducedMotionFade": True, "pointerResponse": True, "pausedBehindDialog": True, "performance": performance})
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
        qa = args.smoke_test or args.animation_test or args.performance_test or args.companion_test
        webview.start(verify_native if qa else None, gui="edgechromium", debug=args.debug, private_mode=False, storage_path=str(DATA_DIR / ("qa-webview" if qa else "webview")))
    finally:
        server.shutdown()
        server.server_close()
    if (args.smoke_test or args.animation_test or args.performance_test or args.companion_test) and not smoke_result.get("passed"):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
