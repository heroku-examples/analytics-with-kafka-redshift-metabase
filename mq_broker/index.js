const Kafka = require("no-kafka");
const mqClient = require("amqplib");
const constants = require("./constants");

const mqUrl = process.env.CLOUDAMQP_URL || "amqp://localhost";
const queue = "tasks";

const consumer = new Kafka.SimpleConsumer({
  idleTimeout: 1000,
  connectionTimeout: 10 * 1000,
  clientId: "mq_broker",
  consumer: {
    connectionString: process.env.KAFKA_URL.replace(/\+ssl/g, ""),
    ssl: {
      cert: process.env.KAFKA_CLIENT_CERT,
      key: process.env.KAFKA_CLIENT_CERT_KEY
    }
  }
});

(async () => {
  const mqConn = await mqClient.connect(mqUrl);
  const chan = await mqConn.createChannel();
  await chan.assertQueue(queue);

  await consumer.init();
  await consumer.subscribe(constants.KAFKA_WEIGHT_TOPIC, messageSet => {
    messageSet.map(({ message }) => {
      chan.sendToQueue(queue, message.value);
    });
    console.log(`Sent ${messageSet.length} messages to mq.`);
  });
})();
