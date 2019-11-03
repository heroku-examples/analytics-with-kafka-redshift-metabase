const runner = require('./runner')
const logger = require('../logger')('generate_orders')
const dbEventController = require('./db-event-controller')
const subscriber = require('pg-listen')({
  connectionString: `${process.env.DATABASE_URL}?ssl=true`
})
const knex = require('knex')({
  client: 'pg',
  connection: `${process.env.DATABASE_URL}?ssl=true`
})
const COMMAND_QUEUE_EVENT_NAME = 'command_update'

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

const getContractIds = () => {
  return knex
    .select('sfid as contractId')
    .from('salesforce.contract')
    .where('pricebook2id', process.env.HEROKU_CONNECT_PRICEBOOK_ID)
}

let deletePromise = Promise.resolve()

const initDBEvents = () => {
  subscriber.notifications.on(COMMAND_QUEUE_EVENT_NAME, (payload) => {
    logger.info(
      `Received notification in '${COMMAND_QUEUE_EVENT_NAME}':`,
      payload
    )
    const command = payload.command
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

  subscriber.events.on('error', (error) => {
    console.error('Fatal database connection error:', error)
    process.exit(1)
  })

  return dbEventController
    .down(knex)
    .then(() => {
      return dbEventController.up(knex)
    })
    .then(() => {
      return subscriber.connect().catch((e) => console.log(e))
    })
    .then(() => {
      subscriber.listenTo(COMMAND_QUEUE_EVENT_NAME)
    })
    .then(() => {
      logger.info('db listner ready')
    })
}

const init = () => {
  let products = null
  let contractId = null

  getProductList()
    .then((_products) => {
      products = _products
      return getContractIds()
    })
    .then( contractIds => { 
      contractId = contractIds[0].contractId
    })
    .then(() => {
      return initDBEvents()
    })
    .then(() => {
      runner.init({ _knex: knex, _products: products, _contractId: contractId })
      logger.info('all ready')
    })
}

init()
