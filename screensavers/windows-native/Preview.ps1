# Launch a resizable preview directly, bypassing the .scr shell association.
$start = [System.Diagnostics.ProcessStartInfo]::new((Join-Path $PSScriptRoot 'Literature Clock.scr'), '--preview')
$start.UseShellExecute = $false
[System.Diagnostics.Process]::Start($start) | Out-Null
