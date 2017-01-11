const winston = require('winston')

function Logger(level) {
    return new (winston.Logger)({
        transports: [
            new (winston.transports.Console)({
                level,
                timestamp: () => new Date().toISOString(),
                formatter: (opts) => `${opts.timestamp()} ${opts.level.toUpperCase()} ${opts.message}`
            })
        ]
    })
}

module.exports = Logger
