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

  await producer.init();

  await consumer.init();
  await consumer.subscribe(constants.KAFKA_TOPIC, messageSet => {
    if (messageSet.length > 0) {
      const value = messageSet[0].message.value.toString("utf8");
      chan.sendToQueue(queue, new Buffer.from(value));
      console.log(`Sent message to mq: ${value}`);
    }

    // if (messageSet.length > 0) {
    //   const values = messageSet.map((m) => m.message.value.toString("utf8"))
    //   values.forEach((value, i) => {
    //     chan.sendToQueue(queue, new Buffer.from(value));
    //     console.log(`Sent message[${i}] to mq: ${value}`);
    //   })
    // }

    chan.assertQueue(queue).then(info => {
      const value = JSON.stringify({ length: info.messageCount });
      producer.send({
        topic: constants.KAFKA_QUEUE_TOPIC,
        message: { value },
        partition: 0
      });
      console.log(`Message queue info: ${value}`);
    });
  });
})();
