const Kafka = require("no-kafka");
const mqClient = require("amqplib");
const constants = require("./constants");

const mqUrl = process.env.CLOUDAMQP_URL || "amqp://localhost";
const queue = "tasks";

const kafkaConfig = {
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
};

const consumer = new Kafka.SimpleConsumer(kafkaConfig);
const producer = new Kafka.Producer(kafkaConfig);

(async () => {
  const mqConn = await mqClient.connect(mqUrl);
  const chan = await mqConn.createChannel();
  await chan.assertQueue(queue);
  chan.prefetch(1);

  await producer.init();

  await consumer.init();
  await consumer.subscribe(constants.KAFKA_TOPIC, messageSet => {
    messageSet.forEach((m) => {
      const value = m.message.value.toString("utf8");
      chan.sendToQueue(queue, new Buffer.from(value));
      console.log(`Sent message to mq: ${value}`);
    })

    chan.assertQueue(queue).then(info => {
      const value = JSON.stringify({
        type: 'queue',
        data: {
          length: info.messageCount,
          time: new Date()
        }
      });
      producer.send({
        topic: constants.KAFKA_QUEUE_TOPIC,
        message: { value },
        partition: 0
      });
      console.log(`Message queue info: ${value}`);
    });
  });
})();
