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
    await wait(4000)
    console.log(message.content.toString());
    chan.ack(message);
  });
})();
