const mqClient = require('amqplib')
const logger = require('../logger')('mq_worker')

const mqUrl = process.env.CLOUDAMQP_URL || 'amqp://localhost'
const queue = 'tasks'

const processMessage = require('./processMessage')

;(async () => {
  const mqConn = await mqClient.connect(mqUrl)
  const chan = await mqConn.createChannel()
  chan.prefetch(10)
  await chan.assertQueue(queue)

  await chan.consume(queue, async (message) => {
    const data = JSON.parse(message.content.toString())
    logger.info(`CON ${JSON.stringify(data)}`)

    const start = new Date()
    const processed = await processMessage(data)
    logger.info(
      `PROCESSED ${JSON.stringify(processed)} in ${new Date() - start}`
    )
    chan.ack(message)

    logger.info(`ACK ${JSON.stringify(data)}`)
  })
})()
