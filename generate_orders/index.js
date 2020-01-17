const Redis = require('ioredis')
const runner = require('./runner')
const logger = require('../logger')('generate_orders')
const knex = require('knex')({
  client: 'pg',
  connection: `${process.env.DATABASE_URL}?ssl=true`
})
const config = require('config')
const redisSub = new Redis(process.env.REDIS_URL, { connectTimeout: 10000 })
const redisPub = new Redis(process.env.REDIS_URL, { connectTimeout: 10000 })

let deletePromise = Promise.resolve()

const initEvents = () => {
  redisSub.subscribe(config.REDIS_CHANNEL, () => {
    console.log('Subscribing to redis')
  })

  redisSub.on('message', function(channel, _message) {
    const message = JSON.parse(_message)
    if (message.type !== 'command') {
      return
    }

    console.log(`Receive command ${message.value}`)

    const command = message.value
    switch (command) {
      case 'start':
        deletePromise.then(runner.startOrderInterval)
        break
      case 'stop':
        runner.stopOrderInterval()
        break
      case 'reset':
        deletePromise = deletePromise.then(runner.deleteAll)
        break
      default:
        logger.info(`Invalid command: ${command}`)
    }
  })
}

const stratStatusPubInterval = () => {
  setInterval(() => {
    redisPub.publish(
      config.REDIS_CHANNEL,
      JSON.stringify({ type: 'status', value: runner.getStatus() })
    )
  }, 3000)
}

const init = () => {
  initEvents()
  runner.init({
    _knex: knex
  })
  logger.info('all ready')
  stratStatusPubInterval()
}

init()
