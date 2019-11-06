const Redis = require('ioredis')
const runner = require('./runner')
const logger = require('../logger')('generate_orders')
const knex = require('knex')({
  client: 'pg',
  connection: `${process.env.DATABASE_URL}?ssl=true`
})
const redisSub = new Redis(process.env.REDIS_URL)
const redisPub = new Redis(process.env.REDIS_URL)
const REDIS_CHANNEL = 'generate_orders2'

console.log(process.env.DATABASE_URL)

const getProductList = () => {
  return knex
    .select(
      'pricebookentry.sfid as pricebookEntryId',
      'unitprice',
      'product2id',
      'family as category'
    )
    .from('salesforce.pricebookentry')
    .innerJoin(
      'salesforce.product2',
      'pricebookentry.product2id',
      '=',
      'product2.sfid'
    )
    .whereNotNull('family')
    .where(
      'pricebookentry.pricebook2id',
      process.env.HEROKU_CONNECT_PRICEBOOK_ID
    )
}

let deletePromise = Promise.resolve()

const initEvents = () => {
  redisSub.subscribe(REDIS_CHANNEL, () => {
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
      REDIS_CHANNEL,
      JSON.stringify({ type: 'status', value: runner.getStatus() })
    )
  }, 3000)
}

const init = () => {
  let products = null

  getProductList()
    .then((_products) => {
      products = _products
      return initEvents()
    })
    .then(() => {
      runner.init({
        _knex: knex,
        _products: products,
        _contractId: process.env.HEROKU_CONNECT_CONTRACT_ID
      })
      logger.info('all ready')
      stratStatusPubInterval()
    })
}

init()
