const mqClient = require("amqplib");

const mqUrl = process.env.CLOUDAMQP_URL || "amqp://localhost";
const queue = "tasks";

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  const mqConn = await mqClient.connect(mqUrl);
  const chan = await mqConn.createChannel();
  await chan.assertQueue(queue);

  await chan.consume(queue, async message => {
    console.log(`Consuming ${message.content.toString()}`)
    await wait(20 * 1000)
    chan.ack(message);
    console.log(`Acknowledged ${message.content.toString()}`)
  });
})();
