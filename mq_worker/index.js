const mqClient = require("amqplib");

const mqUrl = process.env.CLOUDAMQP_URL || "amqp://localhost";
const queue = "tasks";

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

(async () => {
  const mqConn = await mqClient.connect(mqUrl);
  const chan = await mqConn.createChannel();
  chan.prefetch(100)
  await chan.assertQueue(queue);

  await chan.consume(queue, async message => {
    console.log(`CON ${message.content.toString()}`)
    await wait(random(100, 1000))
    chan.ack(message);
    console.log(`ACK ${message.content.toString()}`)
  });
})();
