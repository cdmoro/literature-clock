$ErrorActionPreference = 'Stop'
$destination = Join-Path $env:LOCALAPPDATA 'Literature Clock/Screen Saver'
$key = 'HKCU:/Control Panel/Desktop'
$current = (Get-ItemProperty $key -Name 'SCRNSAVE.EXE' -ErrorAction SilentlyContinue).'SCRNSAVE.EXE'
if ($current -eq "$destination/Literature Clock.scr") {
    Remove-ItemProperty $key -Name 'SCRNSAVE.EXE'
    Set-ItemProperty $key -Name 'ScreenSaveActive' -Value '0'
}
if ((Test-Path $destination) -and !(Get-Item $destination).Attributes.HasFlag([IO.FileAttributes]::ReparsePoint) -and (Test-Path "$destination/Literature Clock.scr")) {
    Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq "$destination/Literature Clock.scr" } | Stop-Process
    $backup = Join-Path $env:LOCALAPPDATA "Literature Clock/Installation Backups/uninstalled-$([Guid]::NewGuid().ToString('N'))"
    New-Item -ItemType Directory -Path (Split-Path $backup) -Force | Out-Null
    Move-Item $destination $backup
    Write-Host "Uninstalled. Files preserved in $backup; preferences and photos retained."
}
Start-Process control.exe -ArgumentList 'desk.cpl,,1'
