const winstonMethods = {
  error: 'error',
  warn: 'log',
  info: 'log',
  http: 'log',
  verbose: 'log',
  debug: 'log',
  silly: 'log'
}

module.exports = () =>
  Object.keys(winstonMethods).reduce((acc, winstonMethod) => {
    const consoleMethod = winstonMethods[winstonMethod]
    acc[winstonMethod] = (...message) =>
      console[consoleMethod](winstonMethod, ...message)
    return acc
  }, {})
