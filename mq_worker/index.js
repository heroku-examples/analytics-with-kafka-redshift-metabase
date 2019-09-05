const mqClient = require("amqplib");

const processFast = require('./process.fast')
const processSlow = require('./process.slow')

const mqUrl = process.env.CLOUDAMQP_URL || "amqp://localhost";
const queue = "tasks";

function isFast() {
  const d = new Date();
  return d.getSeconds() < 30;
}

(async () => {
  const mqConn = await mqClient.connect(mqUrl);
  const chan = await mqConn.createChannel();
  chan.prefetch(1)
  await chan.assertQueue(queue);

  await chan.consume(queue, async message => {
    const content = message.content
    console.log(content)
    console.log(`T ${content}`)
    console.log(`CON ${content.toString()}`)

    const start = new Date()
    const processed = await (isFast() ? processFast(content) : processSlow(content))
    console.log(`PROCESSED ${processed} in ${new Date() - start}`)
    chan.ack(message);

    console.log(`ACK ${content.toString()}`)
  });
})();
