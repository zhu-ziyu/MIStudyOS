$ErrorActionPreference = 'Stop'
$projectDir = $PSScriptRoot
$desktopPython = Join-Path $projectDir '.desktop-env\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $desktopPython)) {
    $candidatePython = Get-Command python -ErrorAction SilentlyContinue
    if ($candidatePython) { & $candidatePython.Source -m venv (Join-Path $projectDir '.desktop-env') }
    else { py -m venv (Join-Path $projectDir '.desktop-env') }
    if ($LASTEXITCODE -ne 0) { throw '需要一个可用的 Python 3.12+ 解释器。' }
}
& $desktopPython -m pip install -r (Join-Path $projectDir 'requirements.txt')
if ($LASTEXITCODE -ne 0) { throw '桌面依赖安装失败。' }
Write-Output '桌面运行环境已准备好。双击 启动宓语StudyOS.cmd 即可。'
