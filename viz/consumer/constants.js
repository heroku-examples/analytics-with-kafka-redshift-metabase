const logger = require('../../logger')('viz')

// Millisecond interval to expect new data
const interval = (module.exports.INTERVAL = 1000)

// Max items to display for rolling data
// Use a 10% buffer to prevent transitions from being too small for the chart bounds
const maxSize = (module.exports.MAX_SIZE = 1 * 60 * (1000 / interval))
module.exports.MAX_BUFFER_SIZE = Math.floor(maxSize * 1.1)

const prefix = process.env.KAFKA_PREFIX || ''

module.exports.KAFKA_TOPIC = prefix + process.env.KAFKA_TOPIC
module.exports.KAFKA_CMD_TOPIC = prefix + process.env.KAFKA_CMD_TOPIC
module.exports.KAFKA_WEIGHT_TOPIC = prefix + process.env.KAFKA_WEIGHT_TOPIC
module.exports.KAFKA_QUEUE_TOPIC = prefix + process.env.KAFKA_QUEUE_TOPIC
module.exports.KAFKA_QUEUE_WORKER = prefix + process.env.KAFKA_QUEUE_WORKER

logger.info(`Kafka topic: ${module.exports.KAFKA_TOPIC}`)
logger.info(`Kafka cmd topic: ${module.exports.KAFKA_CMD_TOPIC}`)
logger.info(`Kafka weight topic: ${module.exports.KAFKA_WEIGHT_TOPIC}`)
logger.info(`Kafka queue length topic: ${module.exports.KAFKA_QUEUE_TOPIC}`)
logger.info(`Kafka queue worker topic: ${module.exports.KAFKA_QUEUE_WORKER}`)
