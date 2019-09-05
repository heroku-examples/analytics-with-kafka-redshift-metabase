// Millisecond interval to expect new data
const interval = (module.exports.INTERVAL = 1000)

// Max items to display for rolling data
// Use a 10% buffer to prevent transitions from being too small for the chart bounds
const maxSize = (module.exports.MAX_SIZE = 1 * 60 * (1000 / interval))
module.exports.MAX_BUFFER_SIZE = Math.floor(maxSize * 1.1)

module.exports.KAFKA_TOPIC = `${
  process.env.KAFKA_PREFIX ? process.env.KAFKA_PREFIX : ''
}${process.env.KAFKA_TOPIC}`
module.exports.KAFKA_CMD_TOPIC = `${
  process.env.KAFKA_PREFIX ? process.env.KAFKA_PREFIX : ''
}${process.env.KAFKA_CMD_TOPIC}`
module.exports.KAFKA_WEIGHT_TOPIC = `${
  process.env.KAFKA_PREFIX ? process.env.KAFKA_PREFIX : ''
}${process.env.KAFKA_WEIGHT_TOPIC}`
module.exports.KAFKA_QUEUE_TOPIC = `${
  process.env.KAFKA_PREFIX ? process.env.KAFKA_PREFIX : ''
}queue-length`
console.log(`Kafka topic: ${module.exports.KAFKA_TOPIC}`) // eslint-disable-line no-console
console.log(`Kafka cmd topic: ${module.exports.KAFKA_CMD_TOPIC}`) // eslint-disable-line no-console
console.log(`Kafka weight topic: ${module.exports.KAFKA_WEIGHT_TOPIC}`) // eslint-disable-line no-console
console.log(`Kafka queue length topic: ${module.exports.KAFKA_QUEUE_TOPIC}`) // eslint-disable-line no-console
