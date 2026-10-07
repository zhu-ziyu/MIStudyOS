# Build a Windows desktop app. The art library remains an independent resource pack.
from pathlib import Path
project = Path(SPECPATH)
pack = project / 'resource-packs' / 'MiStudyOS_Home_4K_AssetPack'
datas = [
    (str(project / 'index.html'), '.'),
    (str(project / 'src'), 'src'),
    (str(project / 'config'), 'config'),
    (str(project / 'assets' / 'lineart' / '01_character' / 'mi_closed_eyes_reference.png'), 'assets/lineart/01_character'),
    (str(project / 'assets' / 'lineart' / '05_decoration_svg'), 'assets/lineart/05_decoration_svg'),
    (str(project / 'assets' / 'lineart' / '06_icons_svg'), 'assets/lineart/06_icons_svg'),
    (str(pack / '00_reference' / 'home_reference_1672x941.png'), 'resource-packs/MiStudyOS_Home_4K_AssetPack/00_reference'),
    (str(pack / '07_background_decor' / 'paper_texture_3840x2160.png'), 'resource-packs/MiStudyOS_Home_4K_AssetPack/07_background_decor'),
]
a = Analysis(['app.py'], pathex=[str(project)], binaries=[], datas=datas, hiddenimports=['webview.platforms.edgechromium'], hookspath=[], hooksconfig={}, runtime_hooks=[], excludes=['cv2', 'numpy'], noarchive=False)
pyz = PYZ(a.pure)
exe = EXE(pyz, a.scripts, [], exclude_binaries=True, name='MiStudyOS', debug=False, bootloader_ignore_signals=False, strip=False, upx=False, console=False, disable_windowed_traceback=False)
coll = COLLECT(exe, a.binaries, a.datas, strip=False, upx=False, name='MiStudyOS')
