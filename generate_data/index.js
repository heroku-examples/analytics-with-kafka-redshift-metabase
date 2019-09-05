const Moment = require('moment')
const ShoppingFeed = require('./shoppingfeed')
const ProgressBar = require('progress')
const CsvStringify = require('csv-stringify')
//const Kafka = require('kafka-node');
const Kafka = require('no-kafka')
const fs = require('fs')
const path = require('path')
const argv = require('minimist')(process.argv)

const configFilePath = path.resolve(argv.c)
const config = require(configFilePath)

if (config.output.type === 'csv') {
  const start = Moment(config.startTime)
  const end = Moment(config.endTime)
  const diff = end.diff(start, 'seconds')

  const bar = new ProgressBar(':bar ', { total: diff })
  let last = start.clone()
  const csvStream = CsvStringify({
    header: true,

    columns: {
      time: 'time',
      session: 'session',
      action: 'action',
      product: 'product',
      category: 'category',
      campaign: 'campaign'
    }
  })
  const writeStream = fs.createWriteStream(config.output.path)

  csvStream.pipe(writeStream)

  const csvOutput = async (event) => {
    //console.log(event);
    csvStream.write(event)
  }

  const updateProgress = (time) => {
    const amount = time.diff(last, 'ms')
    bar.tick(amount / 1000)
    //console.log(amount);
    last = time.clone()
  }

  const endCallback = () => {
    csvStream.end()
  }

  const sf = new ShoppingFeed(
    config,
    csvOutput,
    () => {},
    updateProgress,
    endCallback
  )
  //sf.updateBatch(Moment(config.primeUntil));
  //sf.updateLive();
  sf.updateBatch()
} else if (config.output.type === 'kafka') {
  const start = Moment(config.startTime)
  const end = Moment(config.endTime)
  const diff = end.diff(start, 'seconds')

  const bar = new ProgressBar(':bar ', { total: diff })
  let last = start.clone()

  const producer = new Kafka.Producer(config.output.kafka)
  const consumer = new Kafka.SimpleConsumer({
    idleTimeout: 1000,
    connectionTimeout: 10 * 1000,
    clientId: config.output.cmd_topic,
    consumer: config.output.kafka
  })

  let ended = 0
  let sf = null

  const handleCmdTopic = (messageSet) => {
    const items = messageSet.map((m) =>
      JSON.parse(m.message.value.toString('utf8'))
    )
    for (const cmd of items) {
      sf.handleCmd(cmd)
    }
  }

  const handleOutput = (event) => {
    producer
      .send({
        topic: config.output.topic,
        message: { value: JSON.stringify(event) },
        partition: 0
      })
      .then(() => {
        //console.log(config.output.topic, r)
      })
      .catch((e) => {
        console.log(e)
        throw e
      })
  }

  const handleWeight = (event) => {
    const output = {
      type: 'weights',
      weights: event
    }
    producer
      .send({
        topic: config.output.weight_topic,
        message: { value: JSON.stringify(output) },
        partition: 0
      })
      .then(() => {
        //console.log('sent', output);
      })
      .catch((e) => {
        console.log(e)
        throw e
      })
  }

  const handleProgress = (time) => {
    const amount = time.diff(last, 'ms')
    bar.tick(amount / 1000)
    //console.log(amount);
    if (ended > 0) {
      console.log(sf.now.format(), sf.counts.TOTAL)
    }
    last = time.clone()
  }

  const handleEnd = () => {
    ended++
    if (ended === 1) {
      sf.updateLive()
    }
  }

  sf = new ShoppingFeed(
    config,
    handleOutput,
    handleWeight,
    handleProgress,
    handleEnd
  )

  producer
    .init()
    .then(() => {
      return consumer.init()
    })
    .then(() => {
      return consumer.subscribe(config.output.cmd_topic, handleCmdTopic)
    })
    .then(() => {
      sf.updateBatch(Moment(config.primeUntil))
    })
}
