const mqClient = require('amqplib')

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
    console.log(`CON ${JSON.stringify(data)}`)

    const start = new Date()
    const processed = await processMessage(data)
    console.log(
      `PROCESSED ${JSON.stringify(processed)} in ${new Date() - start}`
    )
    chan.ack(message)

    console.log(`ACK ${JSON.stringify(data)}`)
  })
})()
