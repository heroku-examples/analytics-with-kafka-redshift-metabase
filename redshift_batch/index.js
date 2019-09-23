const Postgres = require('pg-promise')({
  capSQL: true
})
const Config = require('getconfig')
const Kafka = require('no-kafka')
const { performance } = require('perf_hooks')
const logger = require('../logger')('redshift_batch')

Config.database = `${Config.database}?ssl=true`
const db = Postgres(Config.database)
db.connect()
const ecommTable = new Postgres.helpers.ColumnSet(
  ['time', 'session', 'action', 'product', 'category', 'campaign'],
  { table: 'ecommercelogs' }
)

const consumer = new Kafka.SimpleConsumer({
  ...Config.kafka.config,
  groupId: Config.kafka.group
})

let queue = []
let lastUpdate = performance.now()
let lock = false

const dataHandler = (messageSet, topic, partition) => {
  messageSet.forEach((msg) => {
    const now = performance.now()
    const sinceLast = now - lastUpdate
    const value = JSON.parse(msg.message.value)
    const offset = msg.offset
    const length = queue.push(value)

    if (
      lock === false &&
      (length >= Config.queueSize || sinceLast > Config.timeout)
    ) {
      logger.log(queue.length)
      lock = true
      lastUpdate = now
      const query = Postgres.helpers.insert(queue, ecommTable)
      db.query(query, queue)
        .then(() => {
          return consumer.commitOffset({ topic, partition, offset })
        })
        .then(() => {
          lock = false
          logger.log('unlock')
        })
        .catch((err) => {
          lock = false
          logger.log(err)
        })
      queue = []
    }
  })
}

consumer.init().then(() => {
  logger.log(`Subscribing to topic ${Config.kafka.topic}`)
  consumer.subscribe(Config.kafka.topic, dataHandler)
})
