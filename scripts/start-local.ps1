$ErrorActionPreference = 'Stop'

$projectDirectory = Split-Path -Parent $PSScriptRoot
$statusPath = Join-Path $env:TEMP 'ConnectF-start-status.txt'
$logPath = Join-Path $env:TEMP 'ConnectF-start.log'
$serverLogPath = Join-Path $env:TEMP 'ConnectF-server.log'
$serverErrorPath = Join-Path $env:TEMP 'ConnectF-server-error.log'
$serverPath = Join-Path $projectDirectory 'backend\src\localServer.js'
$serverVersion = '2026-10-13-room-access-1'
$port = 8081
$healthUrl = "http://127.0.0.1:$port/health"

function Set-LaunchFailure([string]$message) {
    Add-Content -LiteralPath $logPath -Value $message
    Set-Content -LiteralPath $statusPath -Value "failed|$message"
    exit 1
}

trap {
    Set-LaunchFailure $_.Exception.Message
}

    Set-Content -LiteralPath $statusPath -Value 'checking'
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) {
        Set-LaunchFailure 'Node.js 20 or newer is required to run ConnectF offline.'
    }

    $nodeVersion = (& $node.Source --version).Trim()
    if ($LASTEXITCODE -ne 0) {
        Set-LaunchFailure 'Could not read the Node.js version.'
    }
    $nodeMajor = [int]($nodeVersion -replace '^v(\d+)\..*$', '$1')
    if ($nodeMajor -lt 20) {
        Set-LaunchFailure 'Node.js 20 or newer is required.'
    }

    $health = $null
    try { $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2 } catch { }
    if ($health) {
        if ($health.status -eq 'ok' -and $health.service -eq 'connectf-local' -and $health.version -eq $serverVersion) {
            Set-Content -LiteralPath $statusPath -Value 'started'
            exit 0
        }
        if ($health.status -eq 'ok' -and $health.service -eq 'connectf-local') {
            $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($listener) {
                $serverProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)"
                if ($serverProcess.Name -ne 'node.exe' -or
                    -not $serverProcess.CommandLine -or
                    $serverProcess.CommandLine.IndexOf($serverPath, [StringComparison]::OrdinalIgnoreCase) -lt 0) {
                    Set-LaunchFailure "Port $port does not belong to the ConnectF local server."
                }
                Stop-Process -Id $serverProcess.ProcessId -Force
            }
            Start-Sleep -Milliseconds 500
        } else {
            Set-LaunchFailure "Port $port is already used by another application."
        }
    }

    Set-Content -LiteralPath $logPath -Value "ConnectF offline launcher: $(Get-Date -Format o)"

    Set-Content -LiteralPath $statusPath -Value 'building'
    Push-Location $projectDirectory
    npm run build --prefix frontend *> $logPath
    $buildExitCode = $LASTEXITCODE
    Pop-Location
    if ($buildExitCode -ne 0) {
        Set-LaunchFailure 'Could not build the frontend. Check frontend dependencies and the launch log.'
    }

    if (-not (Test-Path -LiteralPath $serverPath)) {
        Set-LaunchFailure 'The ConnectF local server file was not found.'
    }

    $serverProcess = Start-Process `
        -FilePath $node.Source `
        -ArgumentList @($serverPath) `
        -WorkingDirectory (Join-Path $projectDirectory 'backend') `
        -WindowStyle Hidden `
        -RedirectStandardOutput $serverLogPath `
        -RedirectStandardError $serverErrorPath `
        -PassThru

    Start-Sleep -Milliseconds 700
    if ($serverProcess.HasExited) {
        Set-LaunchFailure 'The local server stopped during startup. Check the server log.'
    }
    Set-Content -LiteralPath $statusPath -Value 'started'
