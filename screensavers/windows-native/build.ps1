param([ValidateSet('win-x64','win-arm64')][string]$Runtime = 'win-x64', [switch]$SkipChecks)
$ErrorActionPreference = 'Stop'
$source = $PSScriptRoot
$version = (Get-Content "$source/VERSION" -Raw).Trim()
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid VERSION' }
function Check-Exit { if ($LASTEXITCODE -ne 0) { throw "Command failed with exit code $LASTEXITCODE" } }
python "$source/prepare.py"
Check-Exit
$compiler = Get-ChildItem "${env:ProgramFiles(x86)}/Windows Kits/10/bin/*/x64/fxc.exe" | Sort-Object FullName -Descending | Select-Object -First 1
if (!$compiler) { throw 'Windows SDK fxc.exe is required to build optical glass.' }
& $compiler.FullName /nologo /T ps_3_0 /E main /Fo "$source/Shaders/OpticalGlass.ps" "$source/Shaders/OpticalGlass.hlsl"
Check-Exit
$output = "$source/build/$Runtime"
dotnet publish "$source/LiteratureClock.csproj" -c Release -r $Runtime --self-contained true -p:Version=$version -o $output
Check-Exit
# Keep the native apphost and all runtime/resources together; a .scr is a Windows executable.
Move-Item "$output/Literature Clock.exe" "$output/Literature Clock.scr" -Force
Copy-Item "$source/Install.ps1", "$source/Uninstall.ps1", "$source/Preview.ps1", "$source/README.md" $output
if (!$SkipChecks -and $Runtime -eq 'win-x64') {
    $start = [System.Diagnostics.ProcessStartInfo]::new("$output/Literature Clock.scr", '--check')
    $start.UseShellExecute = $false # Bypass Windows' .scr file association (/s).
    $check = [System.Diagnostics.Process]::Start($start)
    if (!$check.WaitForExit(180000)) { $check.Kill(); throw 'Native checks timed out' }
    if ($check.ExitCode -ne 0) { if (Test-Path "$output/check-error.txt") { Get-Content "$output/check-error.txt" }; throw 'Native checks failed' }
}
$zip = "$source/build/Literature-Clock-Native-Windows-$Runtime.zip"
# Diagnostics are Actions artifacts, never part of the user download.
$files = Get-ChildItem $output
Compress-Archive -Path $files.FullName -DestinationPath $zip -Force
$hash = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content "$zip.sha256" "$hash  $(Split-Path $zip -Leaf)" -Encoding ascii
Write-Host "Built $zip"
