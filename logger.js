const winston = require('winston')

module.exports = (service, options = {}) =>
  winston.createLogger(
    Object.assign(
      {
        level: 'debug',
        format: winston.format.json(),
        defaultMeta: { service },
        transports: [new winston.transports.Console()]
      },
      options
    )
  )
