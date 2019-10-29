const path = require('path')
const server = require('http').createServer()
const { spawn } = require('child_process')
const WebSocketServer = require('ws').Server
const express = require('express')
const bodyParser = require('body-parser')
const basicAuth = require('express-basic-auth')
const webpack = require('webpack')
const history = require('connect-history-api-fallback')
const webpackDev = require('webpack-dev-middleware')
const MovingAverage = require('moving-average')
const argv = require('optimist').argv
const logger = require('../logger')('viz')

const NODB = !!argv.nodb
const NOKAFKA = !!argv.nokafka
if (NODB) {
  logger.info('DATABASE DISABLED')
}
if (NODB) {
  logger.info('KAFKA DISABLED')
}
const supplyDemandController = require('./supplyDemand')
const webpackConfig = require('./webpack.config')
const Consumer = require('./consumer')
const Kafka = require('no-kafka')
const app = express()
app.use(bodyParser.json())
const constants = require('./consumer/constants')
let dataGeneratorProcess = null

const ma = MovingAverage(constants.INTERVAL)

let Postgres, db, query
if (!NODB) {
  Postgres = require('pg-promise')({
    capSQL: true
  })
  const dbUrl = `${process.env.DATABASE_URL ||
    process.env.AWS_DATABASE_URL ||
    'postgresql://localhost:5432'}?ssl=true`
  console.log(dbUrl)
  db = Postgres(dbUrl)
  if (process.env.USE_DB === 'redshift') {
    query = Postgres.helpers.concat([
      { query: new Postgres.QueryFile('./sql/truncate.sql', { minify: true }) },
      {
        query: new Postgres.QueryFile('./sql/load.sql', { minify: true }),
        values: [
          process.env.FIXTURE_DATA_S3,
          process.env.AWS_ACCESS_KEY_ID,
          process.env.AWS_SECRET_ACCESS_KEY
        ]
      }
    ])
  } else {
    query = Postgres.helpers.concat([
      {
        query: new Postgres.QueryFile('./sql/create_pg.sql', { minify: true })
      },
      { query: new Postgres.QueryFile('./sql/truncate.sql', { minify: true }) },
      { query: new Postgres.QueryFile('./sql/load_pg.sql', { minify: true }) }
    ])
  }
  db.connect()
}

const PRODUCTION = process.env.NODE_ENV === 'production'
const PORT = process.env.PORT || 3000

/*
 * Configure web app and webpack pieces
 *
 */
app.use('/public', express.static(path.join(__dirname, 'public')))

/*
 * Configure admin routes for demoer
 *
 */
const auth = basicAuth({
  users: { '': process.env.ADMIN_PASSWORD || 'supersecret' },
  challenge: true,
  realm: 'Demo Admin'
})

app.get('/admin/reload', auth, (req, res) => {
  if (NODB) {
    return res.send('App running without a progres database.')
  }
  return db
    .none(query)
    .then(() => res.send(`Fixture data truncated and reloaded.`))
    .catch((error) => res.send(`ERROR: ${error}`))
})

app.get('/admin/start', auth, (req, res) => {
  if (dataGeneratorProcess) {
    return res.send('Already running. Restart Heroku `web` process to stop.')
  } else {
    dataGeneratorProcess = spawn('node', ['index.js', '-c', 'kafka.js'], {
      cwd: path.resolve(process.cwd(), '..', 'generate_data')
    })

    dataGeneratorProcess.on('error', (err) => {
      logger.info(`Failed to start data generator: ${err}`)
      dataGeneratorProcess = null
    })
    dataGeneratorProcess.on('close', (code) => {
      logger.info(`Data generator process stopped with code ${code}.`)
      dataGeneratorProcess = null
    })
    dataGeneratorProcess.stdout.on('data', (data) =>
      logger.info(`data generator stdout: ${data}`)
    )
    dataGeneratorProcess.stderr.on('data', (data) =>
      logger.info(`data generator stderr: ${data}`)
    )
    res.send('Data generator started.')
  }
})

app.get('/admin/kill', auth, (req, res) => {
  if (dataGeneratorProcess) {
    dataGeneratorProcess.kill('SIGHUP')
    dataGeneratorProcess = null
    return res.send('Kill signal sent to data generator.')
  } else {
    return res.send('Data generator not running.')
  }
})

supplyDemandController.initRoutes(app, NODB, db)

if (PRODUCTION) {
  app.use(express.static(path.join(__dirname, 'dist')))
  app.get('/:route', (req, res) => {
    if (!req.params) res.sendFile(path.join(__dirname, 'dist/index.html'))
    else res.sendFile(path.join(__dirname, `dist/${req.params.route}.html`))
  })
} else {
  app.use(
    history({
      rewrites: [
        {
          from: /\/(audience|booth|presentation|connect)/,
          to: function(context) {
            return `${context.parsedUrl.pathname}.html`
          }
        }
      ],
      verbose: false
    })
  )
  app.use(webpackDev(webpack(webpackConfig), { stats: 'minimal' }))
}

server.on('request', app)

/*
 * Configure WebSocketServer
 *
 */
const wss = new WebSocketServer({ server })

supplyDemandController.init(wss, db, NODB)

/*
 * Configure Kafka consumer
 *
 */
if (!NOKAFKA) {
  const consumer = new Consumer({
    broadcast: (data) => {
      data.type = 'ecommerce'
      wss.clients.forEach((client) => client.send(JSON.stringify(data)))
    },
    interval: constants.INTERVAL,
    topic: constants.KAFKA_TOPIC,
    consumer: {
      connectionString: process.env.KAFKA_URL.replace(/\+ssl/g, ''),
      ssl: {
        cert: './client.crt',
        key: './client.key'
      }
    }
  })

  const consumer2 = new Kafka.SimpleConsumer({
    idleTimeout: 1000,
    connectionTimeout: 10 * 1000,
    clientId: constants.KAFKA_WEIGHT_TOPIC,
    consumer: {
      connectionString: process.env.KAFKA_URL.replace(/\+ssl/g, ''),
      ssl: {
        cert: './client.crt',
        key: './client.key'
      }
    }
  })

  const producer = new Kafka.Producer({
    connectionString: process.env.KAFKA_URL.replace(/\+ssl/g, ''),
    ssl: {
      cert: './client.crt',
      key: './client.key'
    }
  })
  consumer
    .init()
    .catch((err) => {
      logger.error(`Consumer could not be initialized: ${err}`)
      if (PRODUCTION) throw err
    })
    .then(() => {
      return consumer2.init().catch((err) => {
        logger.error(`Consumer2 could not be initialized: ${err}`)
        if (PRODUCTION) throw err
      })
    })
    .then(() => {
      setInterval(() => {
        const data = {
          type: 'queue',
          data: { processingTime: ma.movingAverage(), time: new Date() }
        }
        wss.clients.forEach((client) => client.send(JSON.stringify(data)))
      }, constants.INTERVAL)

      return Promise.all([
        consumer2
          .subscribe(constants.KAFKA_WEIGHT_TOPIC, (messageSet) => {
            const items = messageSet.map((m) =>
              JSON.parse(m.message.value.toString('utf8'))
            )
            for (const msg of items) {
              wss.clients.forEach((client) => client.send(JSON.stringify(msg)))
            }
          })
          .catch((err) => {
            logger.error(`Weight topic could not be subscribed: ${err}`)
            if (PRODUCTION) throw err
          }),
        consumer2
          .subscribe(constants.KAFKA_QUEUE_TOPIC, (messageSet) => {
            const items = messageSet.map((m) =>
              JSON.parse(m.message.value.toString('utf8'))
            )
            for (const msg of items) {
              ma.push(new Date(msg.data.time), msg.data.processingTime)
            }
          })
          .catch((err) => {
            logger.error(`Queue topic could not be subscribed: ${err}`)
            if (PRODUCTION) throw err
          })
      ])
    })
    .then(() => {
      return producer.init().catch((err) => {
        logger.error(`Producer could not be initialized: ${err}`)
        if (PRODUCTION) throw err
      })
    })
    .then(() => {
      wss.on('connection', function connection(ws) {
        ws.on('message', function incoming(message) {
          try {
            producer.send({
              topic: constants.KAFKA_CMD_TOPIC,
              message: {
                value: message
              },
              partition: 0
            })
          } catch (e) {
            logger.error(e)
          }
        })
      })
      server.listen(PORT, () => {
        logger.info(`http/ws server listening on http://localhost:${PORT}`)
      })
    })
} else {
  server.listen(PORT, () =>
    logger.info(`http/ws server listening on http://localhost:${PORT}`)
  )
}
