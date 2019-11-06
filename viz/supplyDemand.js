const _ = require('lodash')
const moment = require('moment')
const knex = require('knex')({ client: 'pg' })
const Redis = require('ioredis')
const CHART_VISIBLE_PAST_MINUTES_DEFAULT = 5
const CHART_VISIBLE_PAST_MINUTES_MAX = 30
const DATA_PERIOD = '1 week'
const FULFILLMENT_ORDER_TYPE = 'Fulfillment Order'
const PURCHASE_ORDER_TYPE = 'Purchase Order'
const REDIS_CHANNEL = 'generate_orders'
const UPDATE_INTERVAL = 10000
const redisPub = new Redis(process.env.REDIS_URL)
const redisSub = new Redis(process.env.REDIS_URL)

let workerStatus = {}

/*
This query counts number of order items grouped by category and order type
*/
const getQuery = (ago, isPrior = false) => {
  //sanitizing
  let agoChunks = ago ? ago.match(/[A-Za-z0-9 ]+/gi) : null
  ago = agoChunks ? agoChunks[0] : DATA_PERIOD

  return knex
    .select(
      { category: 'family' },
      { count: knex.raw('sum(quantity)') },
      { type: 'recordtype.name' },
      { date: 'order.createddate' }
    )
    .from('salesforce.orderitem')
    .innerJoin(
      'salesforce.product2',
      'orderitem.product2id',
      '=',
      'product2.sfid'
    )
    .innerJoin('salesforce.order', 'orderitem.orderid', '=', 'order.sfid')
    .innerJoin(
      'salesforce.recordtype',
      'order.recordtypeid',
      '=',
      'recordtype.sfid'
    )
    .where('order.status', 'Activated')
    .where(
      'order.createddate',
      isPrior ? '<' : '>',
      knex.raw(`now() - interval '${ago}'`)
    )
    .groupBy(
      'recordtype.name',
      'product2.family',
      'order.createddate',
      'order.sfid'
    )
    .orderBy('order.createddate', 'desc')
    .toString()
}

let pendingOrders = {}

/*
  This interval will keep checking if new order has been created and it has been synced.
  If it's synced then it will create orderitems that's associted with.
  It's stored in "pendingOrders"
*/
const starOrderStatusCheckInterval = (db) => {
  setInterval(() => {
    if (_.keys(pendingOrders).length === 0) {
      return
    }
    /*
    Creating a query to get all orders with pending id
     */
    let query = knex.select('sfid', 'id').from('salesforce.order')
    let ids = []
    _.forEach(pendingOrders, (orderItemData, orderId) => {
      ids.push(orderId)
    })
    query.whereIn('id', ids).whereNotNull('sfid')

    query = query.toString()
    db.any(query)
      .then((orders) => {
        if (!orders || orders.length === 0) {
          return
        }
        return createAllPendingOrderItems(orders, db)
      })
      .catch((e) => {
        console.log(e)
      })
  }, 5000)
}

/*
This method will create all orderitems for given orders
 */

const createAllPendingOrderItems = (orders, db) => {
  let promises = []
  _.forEach(orders, (order) => {
    if (!order.sfid) {
      return
    }
    const orderItemDataList = pendingOrders[order.id]
    //Once synced then the information isn't needed
    delete pendingOrders[order.id]

    _.forEach(orderItemDataList, (orderItemData) => {
      let promise = getPricebookentry(db, orderItemData.categoryName).then(
        (pricebookentries) => {
          const entry = pricebookentries[0]
          return createOrderItem(db, orderItemData.count, order.sfid, entry)
        }
      )
      promises.push(promise)
    })
  })
  return Promise.all(promises)
}

const normalizeData = (rawData) => {
  let data = _.groupBy(rawData, 'category')

  _.forEach(data, (orders, categoryName) => {
    let orderTypes = _.groupBy(orders, 'type')
    const fCounts = _.sumBy(orderTypes[FULFILLMENT_ORDER_TYPE], 'count')
    const pCounts = _.sumBy(orderTypes[PURCHASE_ORDER_TYPE], 'count')
    //if fulfillment order is 0 then the demand is 0
    const demand = fCounts - pCounts //fCounts === 0 ? 0 : (pCounts / fCounts) * 100
    //if demand is higher than 100 then it's set to 100
    data[categoryName] = demand
  })
  return data
}

const getData = (db, query) => {
  return db
    .any(query)
    .then((rawData) => {
      return normalizeData(rawData)
    })
    .catch((error) => console.error(`ERROR: ${error}`))
}

const createOrder = (db, name = null) => {
  let order = {
    effectivedate: moment().format('MM/DD/YYYY'),
    accountid: process.env.HEROKU_CONNECT_ACCOUNT_ID,
    contractid: process.env.HEROKU_CONNECT_CONTRACT_ID,
    pricebook2id: process.env.HEROKU_CONNECT_PRICEBOOK_ID,
    recordtypeid: process.env.HEROKU_CONNECT_FULFILLMENT_TYPE_ID,
    status: 'Draft'
  }

  if (name) {
    order.name = name
  }

  const createOrderQuery = knex('salesforce.order')
    .insert(order)
    .returning('*')
    .toString()

  return db.any(createOrderQuery)
}

const getPricebookentry = (db, categoryName) => {
  const getPricebookentryQuery = knex
    .select('pricebookentry.sfid', 'unitprice', 'product2id')
    .from('salesforce.pricebookentry')
    .innerJoin(
      'salesforce.product2',
      'pricebookentry.product2id',
      '=',
      'product2.sfid'
    )
    .where('salesforce.product2.family', categoryName)
    .where(
      'pricebookentry.pricebook2id',
      process.env.HEROKU_CONNECT_PRICEBOOK_ID
    )
    .toString()

  return db.any(getPricebookentryQuery)
}

const createOrderItem = (db, count, orderid, entry) => {
  let orderItemData = {
    orderid: orderid,
    product2id: entry.product2id,
    unitprice: entry.unitprice,
    pricebookentryid: entry.sfid,
    quantity: count
  }

  let query = knex('salesforce.orderitem')
    .insert(orderItemData)
    .returning('*')
    .toString()

  return db.any(query)
}

const initRoutes = (app, NODB, db) => {
  app.get('/demand/categories', (req, res) => {
    let query = knex
      .select('family as category')
      .from('salesforce.product2')
      .whereNotNull('family')
      .toString()
    db.any(query).then((categories) => {
      res.json(_.map(categories, (c) => c.category))
    })
  })

  /*
    This route returns a list of snapshop of demand in past 5 mins
  */
  app.get('/demand/data', (req, res) => {
    if (NODB) {
      return res.status(500).send('App running without a progres database.')
    }
    let period = parseInt(req.query.period)

    if (!period || !_.isNumber(period) || period < 0) {
      period = CHART_VISIBLE_PAST_MINUTES_DEFAULT
    } else if (period > CHART_VISIBLE_PAST_MINUTES_MAX) {
      period = CHART_VISIBLE_PAST_MINUTES_MAX
    }

    let i = 0
    let promises = []
    while (i <= period) {
      promises.push(getData(db, getQuery(period - i + ' minutes', true)))
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

    let promise = Promise.resolve()
    let successOrders = []

    promise = promise
      .then(() => {
        return createOrder(db, 'From Demo ' + demoOrderNumber++)
      })
      .then((order) => {
        /*
          An order has been created but it hasn't been syned with salesforce at this point.
          orderitem requires "sfid" of the order to be associated with in the database.
          This code below will keep the information about the order so it will try to create orderitems later.
          It's using "id" of order and pushing a list of information about orders.
        */
        _.forEach(orderData, (count, categoryName) => {
          pendingOrders[order[0].id] = pendingOrders[order[0].id] || []
          pendingOrders[order[0].id].push({
            categoryName,
            count
          })
        })
        successOrders.push(order[0])
      })

    promise
      .then(() => {
        res.json(successOrders)
      })
      .catch((e) => {
        console.log(e)
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
  //Orders are created every min and there are some delay and also it's sycned with salesforce every 2 mins.
  //Getting data up to 130 seconds ago seems to work the best.
  //If it's before 2 mins(120) seconds, the data might not be there yet and it will be added to the next round.
  //It seems a lot but it doesn't sync for 2 mins anyway so it's only 10 seconds delay
  const query = getQuery('130 seconds', true)

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
      .then(() => getData(db, query))
      .then(sendData)
      .then(() => {
        setTimeout(() => {
          setNextPromise()
        }, UPDATE_INTERVAL)
      })
  }

  setNextPromise()
  starOrderStatusCheckInterval(db)
  initWorkerStatusUpdate()
}

module.exports = {
  initRoutes,
  init
}
