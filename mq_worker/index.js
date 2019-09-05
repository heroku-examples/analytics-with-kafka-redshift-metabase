const mqClient = require('amqplib')

const mqUrl = process.env.CLOUDAMQP_URL || 'amqp://localhost'
const queue = 'tasks'

const processMessage = require('./process')

const processFast = async (message) => {
  const [user, product, category, campaign] = await Promise.all([
    processMessage.getUserInfo(message),
    processMessage.getProductInfo(message),
    processMessage.getCategoryInfo(message),
    processMessage.getCampaignInfo(message)
  ])
  return processMessage.sendEmail({ user, product, category, campaign })
}

const processSlow = async (message) => {
  const user = await processMessage.getUserInfo(message)
  const product = await processMessage.getProductInfo(message)
  const category = await processMessage.getCategoryInfo(message)
  const campaign = await processMessage.getCampaignInfo(message)
  return processMessage.sendEmail({ user, product, category, campaign })
}

// TODO: figure out how to switch between this in demo
// TODO: can demo deploy only the worker
function isFast() {
  const d = new Date()
  return d.getSeconds() < 30
}

;(async () => {
  const mqConn = await mqClient.connect(mqUrl)
  const chan = await mqConn.createChannel()
  chan.prefetch(200)
  await chan.assertQueue(queue)

  await chan.consume(queue, async (message) => {
    const data = JSON.parse(message.content.toString())
    console.log(`CON ${JSON.stringify(data)}`)

    const start = new Date()
    const processed = await (isFast() ? processFast(data) : processSlow(data))
    console.log(
      `PROCESSED ${JSON.stringify(processed)} in ${new Date() - start}`
    )
    chan.ack(message)

    console.log(`ACK ${JSON.stringify(data)}`)
  })
})()
