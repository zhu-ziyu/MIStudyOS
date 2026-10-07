"""Package generated deliverables without local profiles, logs or test data."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from shutil import copyfile
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--desktop-only', action='store_true')
args = parser.parse_args()

root = Path(__file__).resolve().parent.parent
desktop = root / 'dist' / 'MiStudyOS'
copyfile(root / 'docs' / '桌面软件使用说明.md', desktop / '使用说明.md')
with ZipFile(root / 'dist' / '宓语StudyOS_桌面版.zip', 'w', ZIP_DEFLATED, compresslevel=6) as archive:
    for file in desktop.rglob('*'):
        if file.is_file() and not any(part in ('.studyos-data', 'artifacts') for part in file.relative_to(desktop).parts):
            archive.write(file, Path('MiStudyOS') / file.relative_to(desktop))
if not args.desktop_only:
    pack = root / 'resource-packs' / 'MiStudyOS_Home_4K_AssetPack'
    with ZipFile(root / 'resource-packs' / 'MiStudyOS_Home_4K_AssetPack.zip', 'w', ZIP_DEFLATED, compresslevel=3) as archive:
        for file in pack.rglob('*'):
            if file.is_file():
                archive.write(file, Path(pack.name) / file.relative_to(pack))
print('Packaged desktop application.' if args.desktop_only else 'Packaged desktop application and independent 4K art library.')
