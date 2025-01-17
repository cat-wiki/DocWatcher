# Create necessary directories
New-Item -ItemType Directory -Path "src"
New-Item -ItemType Directory -Path "data"
New-Item -ItemType Directory -Path "logs"
New-Item -ItemType Directory -Path "config"

# Initialize npm project and install dependencies
npm init -y
npm install puppeteer dotenv winston cron

# Create package.json content
$packageJson = @"
{
  "name": "eula-scraper",
  "version": "1.0.0",
  "description": "Web scraper for monitoring EULA/TOS changes",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "test": "node src/test.js"
  },
  "dependencies": {
    "puppeteer": "^21.0.0",
    "dotenv": "^16.0.0",
    "winston": "^3.8.0",
    "cron": "^2.3.0"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
"@
Set-Content -Path "package.json" -Value $packageJson

# Create .env file
$envContent = @"
# Scraper Configuration
MAX_CONCURRENT_SCRAPES=5
SCRAPE_TIMEOUT_MS=30000
RETRY_ATTEMPTS=3
RETRY_DELAY_MS=5000

# Storage Configuration
DATA_DIR=./data
LOG_DIR=./logs

# Optional Proxy Configuration
# PROXY_SERVER=http://proxy.example.com:8080
# PROXY_USERNAME=
# PROXY_PASSWORD=
"@
Set-Content -Path ".env" -Value $envContent

# Create .gitignore
$gitignore = @"
node_modules/
.env
logs/
data/*.json
tmp/
coverage/
.DS_Store
"@
Set-Content -Path ".gitignore" -Value $gitignore

# Create index.js
$indexJs = @"
require('dotenv').config();
const EULAScraper = require('./scraper');
const { setupLogger } = require('./utils/logger');

const logger = setupLogger();

async function main() {
    const scraper = new EULAScraper();
    await scraper.initialize();
    
    try {
        logger.info('Starting EULA scraper...');
        // Your scraping logic here
    } catch (error) {
        logger.error('Error in main process:', error);
    } finally {
        await scraper.close();
    }
}

if (require.main === module) {
    main().catch(console.error);
}
"@
New-Item -ItemType Directory -Path "src" -Force
Set-Content -Path "src\index.js" -Value $indexJs

# Create logger utility
$loggerJs = @"
const winston = require('winston');
const path = require('path');

function setupLogger() {
    return winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        ),
        transports: [
            new winston.transports.File({
                filename: path.join(process.env.LOG_DIR || 'logs', 'error.log'),
                level: 'error'
            }),
            new winston.transports.File({
                filename: path.join(process.env.LOG_DIR || 'logs', 'combined.log')
            }),
            new winston.transports.Console({
                format: winston.format.simple()
            })
        ]
    });
}

module.exports = { setupLogger };
"@
New-Item -ItemType Directory -Path "src\utils" -Force
Set-Content -Path "src\utils\logger.js" -Value $loggerJs

Write-Host "Environment setup complete!"

# Alternative CMD commands:
REM mkdir eula-scraper
REM cd eula-scraper
REM mkdir src data logs config
REM mkdir src\utils
REM npm init -y
REM npm install puppeteer dotenv winston cron