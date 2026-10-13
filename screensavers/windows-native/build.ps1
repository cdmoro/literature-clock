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
dotnet publish "$source/LiteratureClock.csproj" -c Release -r $Runtime --self-contained true -p:Version=$version -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:IncludeAllContentForSelfExtract=true -p:EnableCompressionInSingleFile=true -o $output
Check-Exit
# Publish the complete saver as one executable .scr; all managed resources and runtime
# components are embedded in it. Windows can still launch it via its .scr association.
Move-Item "$output/Literature Clock.exe" "$output/Literature Clock.scr" -Force
if (!$SkipChecks -and $Runtime -eq 'win-x64') {
    $start = [System.Diagnostics.ProcessStartInfo]::new("$output/Literature Clock.scr", '--check')
    $start.UseShellExecute = $false # Bypass Windows' .scr file association (/s).
    $check = [System.Diagnostics.Process]::Start($start)
    if (!$check.WaitForExit(180000)) { $check.Kill(); throw 'Native checks timed out' }
    if ($check.ExitCode -ne 0) { if (Test-Path "$env:TEMP/literature-clock-check-error.txt") { Get-Content "$env:TEMP/literature-clock-check-error.txt" }; throw 'Native checks failed' }
}
$scr = "$output/Literature Clock.scr"
$releaseScr = "$source/build/Literature-Clock-Native-Windows-$Runtime.scr"
Copy-Item $scr $releaseScr -Force
$hash = (Get-FileHash $releaseScr -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content "$releaseScr.sha256" "$hash  $(Split-Path $releaseScr -Leaf)" -Encoding ascii
Write-Host "Built $releaseScr"
