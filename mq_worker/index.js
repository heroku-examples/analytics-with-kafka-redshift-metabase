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
  chan.prefetch(1)
  await chan.assertQueue(queue);

  await chan.consume(queue, async message => {
    console.log(`CON ${message.content.toString()}`)

    const isFast = evenMinute()
    await wait(random(isFast ? 100 : 2000, isFast ? 500 : 5000))
    chan.ack(message);

    console.log(`ACK ${message.content.toString()}`)
  });
})();
