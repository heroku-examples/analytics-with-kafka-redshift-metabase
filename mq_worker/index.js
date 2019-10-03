const Kafka = require('no-kafka')
const logger = require('../logger')('mq_worker')
const processMessage = require('./processMessage')
const constants = require('./constants')

const convertTime = (hrtime) => {
  const nanoseconds = hrtime[0] * 1e9 + hrtime[1]
  const seconds = nanoseconds / 1e9
  return seconds
}

const kafkaConfig = {
  idleTimeout: 1000,
  connectionTimeout: 10 * 1000,
  clientId: 'mq_worker',
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

  await consumer.subscribe(constants.KAFKA_QUEUE_WORKER, async (messageSet) => {
    logger.info(`Message set length: ${messageSet.length}`)

    const times = await Promise.all(
      messageSet.map(async (m) => {
        const value = m.message.value.toString('utf8')

        logger.info(`Starting processing: ${value}`)

        const start = process.hrtime()
        const data = JSON.parse(value)
        const processed = await processMessage(data)
        const elapsed = convertTime(process.hrtime(start))

        logger.info(`Processed ${elapsed} - ${JSON.stringify(processed)}`)

        return elapsed
      })
    )

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length
    logger.info(`Avg time for ${times.length} items ${avgTime}`)

    producer.send({
      topic: constants.KAFKA_QUEUE_TOPIC,
      partition: 0,
      message: {
        value: JSON.stringify({
          type: 'queue',
          data: {
            avgTime,
            time: new Date()
          }
        })
      }
    })
  })
})()
