const mqClient = require("amqplib");

const mqUrl = process.env.CLOUDAMQP_URL || "amqp://localhost";
const queue = "tasks";

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function evenMinute() {
  const d = new Date();
  return d.getMinutes() % 2 === 0;
}

(async () => {
  const mqConn = await mqClient.connect(mqUrl);
  const chan = await mqConn.createChannel();
  chan.prefetch(5)
  await chan.assertQueue(queue);

  await chan.consume(queue, async message => {
    console.log(`CON ${message.content.toString()}`)

    const isFast = evenMinute()
    await wait(random(isFast ? 1 : 1000, isFast ? 1 : 10000))
    chan.ack(message);

    console.log(`ACK ${message.content.toString()}`)
  });
})();
