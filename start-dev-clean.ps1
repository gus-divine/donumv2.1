# Donum 2.1 Development Server - Simple Start Script
# This script should be run directly in PowerShell terminal
# Sets up environment variables and starts Next.js dev server

<#
.SYNOPSIS
    Starts Donum 2.1 development services (Next.js Frontend)

.DESCRIPTION
    Starts Donum 2.1 development services using Docker:
    - Next.js Development Server (port 3000)

    Automatically detects and stops existing processes, then starts Docker containers.
    Requires Docker Desktop to be installed and running.
#>

#region Configuration
$NEXTJS_PORT = 3000
$PROJECT_ROOT = $PSScriptRoot
$WEB_DIR = Join-Path $PROJECT_ROOT "web"
#endregion

#region Helper Functions

<#
.SYNOPSIS
    Checks if a port is currently in use (by host processes or Docker)
#>
function Test-PortInUse {
    param([int]$Port)

    # Check Docker first
    if (Test-PortUsedByDocker -Port $Port) {
        return $true
    }

    # Check host processes
    try {
        $connections = netstat -ano | findstr ":$Port" | findstr "LISTENING"
        return $connections -ne $null
    } catch {
        Write-Warning "Failed to check port $Port : $_"
        return $false
    }
}

<#
.SYNOPSIS
    Kills all Node.js processes
#>
function Kill-DevProcesses {
    Write-Host "Stopping development processes..." -ForegroundColor Yellow

    # Kill Node.js processes
    $nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-Host "Stopping $($nodeProcesses.Count) Node.js processes..." -ForegroundColor Yellow
        $nodeProcesses | Stop-Process -Force
    }

    # Wait a moment for processes to stop
    Start-Sleep -Seconds 2
    Write-Host "Process cleanup completed" -ForegroundColor Green
}

<#
.SYNOPSIS
    Checks if script is running in Cursor IDE
#>
function Test-InCursor {
    return $env:TERM_PROGRAM -eq "vscode" -or
           $env:CURSOR -eq "true" -or
           (Get-Process -Name "cursor" -ErrorAction SilentlyContinue)
}

<#
.SYNOPSIS
    Checks if Docker is installed and available
#>
function Test-DockerAvailable {
    try {
        $null = docker --version 2>&1
        return $true
    } catch {
        return $false
    }
}

<#
.SYNOPSIS
    Checks if Docker containers are running for this project
#>
function Test-DockerContainersRunning {
    if (-not (Test-DockerAvailable)) {
        return @{
            Running = $false
            Containers = @()
        }
    }

    try {
        # Check for project-specific containers
        $containers = docker ps --format "{{.Names}}" 2>&1
        if ($LASTEXITCODE -ne 0) {
            return @{
                Running = $false
                Containers = @()
            }
        }

        $projectContainers = @()
        $containerNames = @("Donum2.1")
        
        foreach ($container in $containers) {
            if ($container -in $containerNames) {
                $projectContainers += $container
            }
        }

        return @{
            Running = $projectContainers.Count -gt 0
            Containers = $projectContainers
        }
    } catch {
        return @{
            Running = $false
            Containers = @()
        }
    }
}

<#
.SYNOPSIS
    Checks if a port is in use by Docker containers
#>
function Test-PortUsedByDocker {
    param([int]$Port)

    if (-not (Test-DockerAvailable)) {
        return $false
    }

    try {
        # Check if any container is using this port
        $containers = docker ps --format "{{.Names}} {{.Ports}}" 2>&1
        if ($LASTEXITCODE -ne 0) {
            return $false
        }

        foreach ($line in $containers) {
            if ($line -match ":$Port->" -or $line -match "0\.0\.0\.0:$Port") {
                return $true
            }
        }
        return $false
    } catch {
        return $false
    }
}

<#
.SYNOPSIS
    Stops Docker containers for this project
#>
function Stop-DockerContainers {
    if (-not (Test-DockerAvailable)) {
        Write-Host "Docker is not available. Skipping Docker container stop." -ForegroundColor Yellow
        return
    }

    try {
        Write-Host "Stopping Docker containers..." -ForegroundColor Yellow
        
        # Try docker-compose down first (preferred)
        $composeFile = Join-Path $WEB_DIR "docker-compose.yml"
        if (Test-Path $composeFile) {
            Push-Location $WEB_DIR
            docker-compose down 2>&1 | Out-Null
            Pop-Location
        }

        # Also stop individual containers if they exist
        $containerNames = @("Donum2.1")
        foreach ($containerName in $containerNames) {
            docker stop $containerName 2>&1 | Out-Null
            docker rm $containerName 2>&1 | Out-Null
        }

        Write-Host "Docker containers stopped" -ForegroundColor Green
    } catch {
        Write-Warning "Failed to stop Docker containers: $_"
    }
}

<#
.SYNOPSIS
    Starts Docker containers for this project
#>
function Start-DockerContainers {
    if (-not (Test-DockerAvailable)) {
        Write-Host "Docker is not available. Cannot start Docker containers." -ForegroundColor Yellow
        return $false
    }

    try {
        Write-Host "Starting Docker containers..." -ForegroundColor Cyan
        
        $composeFile = Join-Path $WEB_DIR "docker-compose.yml"
        $devComposeFile = Join-Path $WEB_DIR "docker-compose.dev.yml"
        
        if (-not (Test-Path $composeFile)) {
            Write-Host "docker-compose.yml not found. Cannot start Docker containers." -ForegroundColor Yellow
            return $false
        }

        Push-Location $WEB_DIR
        
        # Try to start Docker Desktop if it's not running
        $dockerRunning = docker info 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Docker Desktop may not be running. Attempting to start..." -ForegroundColor Yellow
            # Try to start Docker Desktop (Windows)
            Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -ErrorAction SilentlyContinue
            Write-Host "Waiting for Docker to start..." -ForegroundColor Yellow
            Start-Sleep -Seconds 10
            
            # Check again
            $dockerRunning = docker info 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Write-Host "Docker Desktop is not running. Please start it manually." -ForegroundColor Red
                Pop-Location
                return $false
            }
        }

        # Start with docker-compose
        if (Test-Path $devComposeFile) {
            Write-Host "Starting in development mode with hot reload..." -ForegroundColor Cyan
            docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build 2>&1 | Out-Null
        } else {
            Write-Host "Starting in development mode..." -ForegroundColor Cyan
            docker-compose up -d --build 2>&1 | Out-Null
        }

        if ($LASTEXITCODE -eq 0) {
            Write-Host "Docker containers started successfully!" -ForegroundColor Green
            Write-Host "Frontend: http://localhost:$NEXTJS_PORT" -ForegroundColor Cyan
            Pop-Location
            return $true
        } else {
            Write-Host "Failed to start Docker containers." -ForegroundColor Red
            Pop-Location
            return $false
        }
    } catch {
        Write-Host "Error starting Docker containers: $_" -ForegroundColor Red
        Pop-Location
        return $false
    }
}

<#
.SYNOPSIS
    Loads environment variables from .env file
#>
function Load-EnvFile {
    param([string]$FilePath)

    if (-not (Test-Path $FilePath)) {
        return
    }

    try {
        Write-Host "Loading $FilePath..." -ForegroundColor Cyan
        Get-Content $FilePath | ForEach-Object {
            $line = $_.Trim()
            # Skip comments and empty lines
            if ($line -and -not $line.StartsWith("#")) {
                if ($line -match '^\s*([^#][^=]+)=(.*)$') {
                    $key = $matches[1].Trim()
                    $value = $matches[2].Trim().Trim('"').Trim("'")
                    [Environment]::SetEnvironmentVariable($key, $value, "Process")
                }
            }
        }
        Write-Host "Environment loaded from $FilePath" -ForegroundColor Green
    } catch {
        Write-Warning "Failed to load $FilePath : $_"
    }
}

<#
.SYNOPSIS
    Cleans up development processes and optionally Docker containers
#>
function Clear-ExistingProcesses {
    # Always stop Docker containers
    Stop-DockerContainers
    
    # Also kill any host processes that might be using the ports
    Kill-DevProcesses
}

#endregion

#region Main Script

try {
    # Check if running interactively
    if (-not [Environment]::UserInteractive) {
        Write-Host "Error: This script requires an interactive PowerShell session." -ForegroundColor Red
        Write-Host "Please run this script directly in a PowerShell terminal, not via automation." -ForegroundColor Yellow
        exit 1
    }

    Write-Host "Donum 2.1 Development Server - Smart Start" -ForegroundColor Green
    Write-Host "=".PadRight(50, "=") -ForegroundColor Gray

    # Check if running in Cursor
    if (-not (Test-InCursor)) {
        Write-Host "Warning: Not running in Cursor terminal. Some features may not work properly." -ForegroundColor Yellow
        Write-Host "   Recommended: Run this script directly in Cursor terminal." -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "[*] Detecting what's running..." -ForegroundColor Cyan

    # Detect what's currently running
    $dockerStatus = Test-DockerContainersRunning
    $nextJsPortInUse = Test-PortInUse -Port $NEXTJS_PORT
    $dockerAvailable = Test-DockerAvailable

    # Show status
    if ($dockerStatus.Running) {
        Write-Host "   [+] Docker containers running: $($dockerStatus.Containers -join ', ')" -ForegroundColor Yellow
    }
    if ($nextJsPortInUse) {
        $source = if (Test-PortUsedByDocker -Port $NEXTJS_PORT) { "Docker" } else { "Host process" }
        Write-Host "   [+] Port $NEXTJS_PORT in use ($source)" -ForegroundColor Yellow
    }
    if ($dockerAvailable) {
        Write-Host "   [+] Docker is available" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "[*] Cleaning up existing processes..." -ForegroundColor Cyan

    # Kill everything automatically
    Clear-ExistingProcesses

    Write-Host ""
    Write-Host "[*] Starting services with Docker..." -ForegroundColor Green
    Write-Host "=".PadRight(50, "=") -ForegroundColor Gray

    # Docker is required
    if (-not $dockerAvailable) {
        Write-Host ""
        Write-Host "[ERROR] Docker is not available!" -ForegroundColor Red
        Write-Host "   This script now requires Docker to run." -ForegroundColor Yellow
        Write-Host "   Please install Docker Desktop and ensure it's running." -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }

    Write-Host ""
    Write-Host "Starting Docker containers..." -ForegroundColor Cyan
    $useDocker = Start-DockerContainers
    
    if ($useDocker) {
        Write-Host ""
        Write-Host "[SUCCESS] Services started in Docker!" -ForegroundColor Green
        Write-Host "Frontend: http://localhost:$NEXTJS_PORT" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "To stop: docker-compose down (from web directory)" -ForegroundColor Gray
        Write-Host "To view logs: docker-compose logs -f (from web directory)" -ForegroundColor Gray
        exit 0
    } else {
        Write-Host ""
        Write-Host "[ERROR] Failed to start Docker containers!" -ForegroundColor Red
        Write-Host "   Please check Docker Desktop is running and try again." -ForegroundColor Yellow
        Write-Host "   Or run manually: cd web && docker-compose up" -ForegroundColor Gray
        exit 1
    }

} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ScriptStackTrace) {
        Write-Host "Stack trace: $($_.ScriptStackTrace)" -ForegroundColor Gray
    }
    exit 1
}

#endregion
