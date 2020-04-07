const _ = require('lodash')
const moment = require('moment')
const config = require('config').supplyDemand
const knex = require('knex')({ client: 'pg' })
const Redis = require('ioredis')

const CHART_VISIBLE_MINS = config.chart.CHART_VISIBLE_MINS
const MAX_SNAPSHOTS_PAST_MINUTES = config.MAX_SNAPSHOTS_PAST_MINUTES
const DEFAULT_DATA_PERIOD = config.DEFAULT_DATA_PERIOD
const FULFILLMENT_ORDER_TYPE = config.FULFILLMENT_ORDER_TYPE
const PURCHASE_ORDER_TYPE = config.PURCHASE_ORDER_TYPE
const REDIS_CHANNEL = config.REDIS_CHANNEL
const CATEGORY_LIST = config.CATEGORY_LIST
const UPDATE_INTERVAL = config.UPDATE_INTERVAL

const redisPub = new Redis(process.env.REDIS_URL)
const redisSub = new Redis(process.env.REDIS_URL)

let workerStatus = {}

const getDataByType = (type, db, timeCondition) => {
  let query = knex('orders')
    .select('category', knex.raw('sum(amount) as total'))
    .where('type', type)
    .where('approved', true)
    .where(
      'createdat',
      timeCondition[0],
      knex.raw(`now() - interval '${timeCondition[1]}'`)
    )
    .groupBy('category')
    .toQuery()

  return db.any(query)
}

const getData = (db, timeCondition = ['>', DEFAULT_DATA_PERIOD]) => {
  let fulfillmentData = null

  return getDataByType(FULFILLMENT_ORDER_TYPE, db, timeCondition)
    .then((data) => {
      fulfillmentData = data
      return getDataByType(PURCHASE_ORDER_TYPE, db, timeCondition)
    })
    .then((purchaseData) => {
      let data = {}
      _.forEach(CATEGORY_LIST, (cat) => (data[cat] = 0))

      _.forEach(fulfillmentData, (order) => {
        data[order.category] += parseInt(order.total)
      })

      _.forEach(purchaseData, (order) => {
        data[order.category] -= parseInt(order.total)
      })

      return data
    })
}

const createOrder = (db, orderData) => {
  const categories = _.keys(orderData)
  const orders = categories.map((category) => {
    const order = {
      category,
      amount: orderData[category],
      approved: false,
      type: FULFILLMENT_ORDER_TYPE,
      createdat: moment().toISOString()
    }
    const query = knex('orders')
      .insert(order)
      .returning('*')
      .toQuery()
    return db.any(query)
  })

  return Promise.all(orders)
}

const initRoutes = (app, NODB, db) => {
  app.get('/demand/categories', (req, res) => {
    res.json(CATEGORY_LIST)
  })

  /*
    This route returns a list of snapshots of the past period of demands vs supplies
  */
  app.get('/demand/data', (req, res) => {
    if (NODB) {
      return res.status(500).send('App running without a progres database.')
    }
    let period = parseInt(req.query.period)

    if (!period || !_.isNumber(period) || period < 0) {
      period = CHART_VISIBLE_MINS
    } else if (period > MAX_SNAPSHOTS_PAST_MINUTES) {
      period = MAX_SNAPSHOTS_PAST_MINUTES
    }
    let i = 0
    let promises = []
    while (i <= period) {
      promises.push(getData(db, ['<', period - i + ' minutes']))
      i++
    }

    Promise.all(promises)
      .then((list) => {
        let data = {}
        //generating an object that grouped by category name
        _.reduce(
          list,
          (d, items) => {
            _.forEach(items, (value, key) => {
              d[key] = data[key] || []
              d[key].push(value)
            })
            return d
          },
          data
        )
        res.send(data)
      })
      .catch((e) => {
        res.send(e)
      })
  })

  let demoOrderNumber = 1

  app.post('/demand/orders', (req, res) => {
    if (NODB) {
      return res.status(500).send('App running without a progres database.')
    }

    let orderData

    try {
      orderData = JSON.parse(req.body.orders)
    } catch (e) {
      res.status(500).send('Error: order object is not valid JSON')
    }

    return createOrder(db, orderData, 'From Demo ' + demoOrderNumber++)
      .then((data) => {
        res.json(data)
      })
      .catch((e) => {
        res.status(500).send('something went wrong', e)
      })
  })

  app.post('/demand/command', (req, res) => {
    if (NODB) {
      return res.status(500).send('App running without a postgres database.')
    }

    let command = req.body.command
    if (['start', 'stop', 'reset'].indexOf(command) > -1) {
      redisPub.publish(
        REDIS_CHANNEL,
        JSON.stringify({ type: 'command', value: command })
      )
      res.send({})
    } else {
      res.status(500).send('Invalid command')
    }
  })

  app.get('/demand/worker-status', (req, res) => {
    res.json(workerStatus)
  })

  app.get('/demand/chart-config', (req, res) => {
    res.json(config || {})
  })
}

const initWorkerStatusUpdate = () => {
  redisSub.subscribe(REDIS_CHANNEL, () => {
    console.log('Subscribing to redis')
  })

  redisSub.on('message', function(channel, _message) {
    const message = JSON.parse(_message)
    if (message.type === 'status') {
      workerStatus = message.value
    }
  })
}

const init = (wss, db, NODB) => {
  if (NODB) {
    return console.log('App running without a progres database.')
  }

  const sendData = (data) => {
    const sendingData = {
      type: 'orders',
      data: data
    }
    wss.clients.forEach((client) => client.send(JSON.stringify(sendingData)))
  }

  let currentPromise = Promise.resolve()

  const setNextPromise = () => {
    currentPromise = currentPromise
      .then(() => getData(db))
      .then(sendData)
      .then(() => {
        setTimeout(() => {
          setNextPromise()
        }, UPDATE_INTERVAL)
      })
  }

  setNextPromise()
  initWorkerStatusUpdate()
}

module.exports = {
  initRoutes,
  init
}
