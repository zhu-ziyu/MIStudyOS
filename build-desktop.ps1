$ErrorActionPreference = 'Stop'
$projectDir = $PSScriptRoot
$desktopPython = Join-Path $projectDir '.desktop-env\Scripts\python.exe'
$desktopOut = [System.IO.Path]::GetFullPath((Join-Path $projectDir 'dist\MiStudyOS'))
$workspaceBoundary = [System.IO.Path]::GetFullPath($projectDir).TrimEnd('\') + '\'
if (-not $desktopOut.StartsWith($workspaceBoundary, [System.StringComparison]::OrdinalIgnoreCase)) { throw '打包目标不在项目目录内。' }
$buildRoot = [System.IO.Path]::GetFullPath((Join-Path $projectDir 'build'))
$distRoot = [System.IO.Path]::GetFullPath((Join-Path $projectDir 'dist'))
foreach ($generatedRoot in @($buildRoot, $distRoot)) {
    if (-not $generatedRoot.StartsWith($workspaceBoundary, [System.StringComparison]::OrdinalIgnoreCase)) { throw '生成目录不在项目目录内。' }
}
# Preserve the installed copy's profile before PyInstaller replaces generated
# files. The backup remains recoverable even if a build fails.
$stateSource = Join-Path $desktopOut '.studyos-data'
$stateBackup = Join-Path $projectDir ('artifacts\desktop-state-backup\' + [guid]::NewGuid().ToString())
if (Test-Path -LiteralPath $stateSource) {
    New-Item -ItemType Directory -Path $stateBackup -Force | Out-Null
    Copy-Item -LiteralPath $stateSource -Destination $stateBackup -Recurse -Force
}
Push-Location -LiteralPath $projectDir
try {
    & $desktopPython -m PyInstaller --noconfirm --distpath $distRoot --workpath $buildRoot MiStudyOS.spec
    if ($LASTEXITCODE -ne 0) { throw '桌面软件打包失败。' }
    Copy-Item -LiteralPath (Join-Path $projectDir 'config') -Destination $desktopOut -Recurse -Force
    $savedState = Join-Path $stateBackup '.studyos-data'
    if (Test-Path -LiteralPath $savedState) { Copy-Item -LiteralPath $savedState -Destination $desktopOut -Recurse -Force }
    Write-Output (Join-Path $desktopOut 'MiStudyOS.exe')
}
finally { Pop-Location }
