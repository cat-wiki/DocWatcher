# Initialize npm project
npm init -y

# Install dependencies
npm install puppeteer
npm install dotenv
npm install winston
npm install cron

# Create necessary directories
mkdir src
mkdir data
mkdir logs
mkdir config

# Create initial configuration files
cat > package.json << EOL
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
EOL

# Create environment file
cat > .env << EOL
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
EOL

# Create .gitignore
cat > .gitignore << EOL
node_modules/
.env
logs/
data/*.json
tmp/
coverage/
.DS_Store
EOL

# Move scraper code to src directory
cat > src/index.js << EOL
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
EOL

# Create logger utility
cat > src/utils/logger.js << EOL
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
EOL

# Set execute permissions
chmod +x src/index.js

echo "Environment setup complete!"
EOL