const mqClient = require("amqplib");

const mqUrl = process.env.CLOUDAMQP_URL || "amqp://localhost";
const queue = "tasks";

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const PREFETCH = 5;
const WAIT_TIME = 1000;

(async () => {
  const mqConn = await mqClient.connect(mqUrl);
  const chan = await mqConn.createChannel();
  chan.prefetch(PREFETCH)
  await chan.assertQueue(queue);

  await chan.consume(queue, async message => {
    console.log(`CON ${message.content.toString()}`)
    await wait(WAIT_TIME)
    chan.ack(message);
    console.log(`ACK ${message.content.toString()}`)
  });
})();
