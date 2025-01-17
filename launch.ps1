# PowerShell Launch Script (launch.ps1)

param (
    [switch]$debug,
    [string]$config = "default",
    [int]$concurrent = 5
)

# Set environment variables
$env:NODE_ENV = if ($debug) { "development" } else { "production" }
$env:MAX_CONCURRENT_SCRAPES = $concurrent

# Launch commands
if ($debug) {
    Write-Host "Launching in debug mode..."
    node --inspect src/index.js
} else {
    Write-Host "Launching in production mode..."
    node src/index.js
}