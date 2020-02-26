const logger = require('../logger')('mq_broker')

const prefix = process.env.KAFKA_PREFIX || ''

module.exports.KAFKA_TOPIC = prefix + process.env.KAFKA_TOPIC
module.exports.KAFKA_QUEUE_TOPIC = prefix + process.env.KAFKA_QUEUE_TOPIC
module.exports.KAFKA_QUEUE_WORKER = prefix + process.env.KAFKA_QUEUE_WORKER

logger.info(`Kafka topic: ${module.exports.KAFKA_TOPIC}`)
logger.info(`Kafka queue length topic: ${module.exports.KAFKA_QUEUE_TOPIC}`)
logger.info(`Kafka queue worker topic: ${module.exports.KAFKA_QUEUE_WORKER}`)
