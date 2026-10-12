# Run from the extracted download. Installs for this user without administrator rights.
$ErrorActionPreference = 'Stop'
$source = $PSScriptRoot
$destination = Join-Path $env:LOCALAPPDATA 'Literature Clock/Screen Saver'
$staging = "$destination.staging-$([Guid]::NewGuid().ToString('N'))"
$backup = Join-Path $env:LOCALAPPDATA "Literature Clock/Installation Backups/$((Get-Date).ToString('yyyyMMdd-HHmmss'))-$([Guid]::NewGuid().ToString('N'))"
$payload = Join-Path $source 'Literature Clock.scr'
if (!(Test-Path $payload) -or !(Test-Path "$source/Resources/locales.json") -or !(Test-Path "$source/Literature Clock.dll")) { throw 'Extract the complete ZIP before installing.' }
if ((Test-Path $destination) -and (Get-Item $destination).Attributes.HasFlag([IO.FileAttributes]::ReparsePoint)) { throw 'The destination is a link. Choose a normal user installation folder.' }
if ((Test-Path $destination) -and !(Test-Path "$destination/Literature Clock.scr")) { throw 'The destination contains an unrelated installation.' }
New-Item -ItemType Directory -Path $staging -Force | Out-Null
try {
    Get-ChildItem $source | Copy-Item -Destination $staging -Recurse
    $start = [System.Diagnostics.ProcessStartInfo]::new("$staging/Literature Clock.scr", '--check')
    $start.UseShellExecute = $false # Bypass Windows' .scr file association (/s).
    $check = [System.Diagnostics.Process]::Start($start)
    if (!$check.WaitForExit(180000)) { $check.Kill(); throw 'Native checks timed out' }
    if ($check.ExitCode -ne 0) { throw 'The downloaded resources failed validation.' }
    # Stop only our own installed executable before moving its runtime directory.
    Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq "$destination/Literature Clock.scr" } | Stop-Process
    if (Test-Path $destination) {
        New-Item -ItemType Directory -Path (Split-Path $backup) -Force | Out-Null
        Move-Item $destination $backup
    }
    try { Move-Item $staging $destination }
    catch { if (Test-Path $backup) { Move-Item $backup $destination }; throw }
    $key = 'HKCU:/Control Panel/Desktop'
    Set-ItemProperty $key -Name 'SCRNSAVE.EXE' -Value "$destination/Literature Clock.scr"
    Set-ItemProperty $key -Name 'ScreenSaveActive' -Value '1'
    Start-Process control.exe -ArgumentList 'desk.cpl,,1'
    Write-Host "Installed in $destination. Previous copies are retained in Installation Backups."
} catch {
    # Preserve staging for inspection; never remove an unrelated folder on failure.
    Write-Error $_
    exit 1
}
