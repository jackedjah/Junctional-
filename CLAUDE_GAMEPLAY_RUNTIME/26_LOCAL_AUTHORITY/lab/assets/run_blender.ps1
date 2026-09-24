# Single-job native Blender runner for the character session.
# Usage: run_blender.ps1 -Script <py> [-Blend <file>] [-TimeoutSec 900]
param([Parameter(Mandatory=$true)][string]$Script, [string]$Blend = '', [int]$TimeoutSec = 900)
$ErrorActionPreference = 'Stop'
$R = Split-Path -Parent $Script
if (@(Get-Process | Where-Object ProcessName -like '*blender*').Count) { throw 'Blender occupied; preserved. Not launching.' }
$alias = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\blender-launcher.exe'
$args = @('--background', '--disable-autoexec')
if ($Blend) { $args += "`"$Blend`"" }
$args += @('--python-exit-code', '17', '--python', "`"$Script`"")
$lock = Join-Path $R 'JOB.lock'
"owner=$PID script=$Script blend=$Blend started=$(Get-Date -Format o)" | Set-Content $lock
$t = Get-Date
$p = Start-Process -FilePath $alias -ArgumentList $args -WindowStyle Hidden -PassThru
$done = $p.WaitForExit($TimeoutSec * 1000)
$el = (Get-Date) - $t
if (-not $done) { Write-Output "TIMEOUT after $TimeoutSec s; process $($p.Id) still running (left alive)"; exit 2 }
Remove-Item $lock -ErrorAction SilentlyContinue
Write-Output ("exit={0} elapsed={1:mm\:ss}" -f $p.ExitCode, $el)
