const Kafka = require('no-kafka')
const constants = require('./constants')
const logger = require('../logger')('mq_broker')

const kafkaConfig = {
  idleTimeout: 1000,
  connectionTimeout: 10 * 1000,
  clientId: 'mq_broker',
  consumer: {
    connectionString: process.env.KAFKA_URL.replace(/\+ssl/g, ''),
    ssl: {
      cert: process.env.KAFKA_CLIENT_CERT,
      key: process.env.KAFKA_CLIENT_CERT_KEY
    }
  }
}

const consumer = new Kafka.SimpleConsumer(kafkaConfig)
const producer = new Kafka.Producer(kafkaConfig)

;(async () => {
  await producer.init()
  await consumer.init()

  await consumer.subscribe(constants.KAFKA_TOPIC, (messageSet) => {
    logger.info(`Message set length: ${messageSet.length}`)

    messageSet.forEach((m) => {
      const value = m.message.value.toString('utf8')

      producer.send({
        topic: constants.KAFKA_QUEUE_WORKER,
        message: { value },
        partition: 0
      })

      logger.info(`Sent message to ${constants.KAFKA_QUEUE_WORKER}: ${value}`)
    })
  })
})()
