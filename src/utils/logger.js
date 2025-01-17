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
