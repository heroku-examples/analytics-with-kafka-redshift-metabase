const mqClient = require('amqplib')

const processFast = require('./process.fast')
const processSlow = require('./process.slow')

const mqUrl = process.env.CLOUDAMQP_URL || 'amqp://localhost'
const queue = 'tasks'

function isFast() {
  const d = new Date()
  return d.getSeconds() < 30
}

;(async () => {
  const mqConn = await mqClient.connect(mqUrl)
  const chan = await mqConn.createChannel()
  chan.prefetch(1)
  await chan.assertQueue(queue)

  await chan.consume(queue, async (message) => {
    const data = JSON.parse(message.content.toString())
    console.log(`CON ${data}`)

    const start = new Date()
    const processed = await (isFast() ? processFast(data) : processSlow(data))
    console.log(`PROCESSED ${processed} in ${new Date() - start}`)
    chan.ack(message)

    console.log(`ACK ${data}`)
  })
})()
