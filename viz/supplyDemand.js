const _ = require('lodash')
const moment = require('moment')
const knex = require('knex')({ client: 'pg' })

const CHART_VISIBLE_PAST_MINUTES = 5
const DATA_PERIOD = '1 week'
const FULLFILLMENT_ORDER_TYPE = 'Fulfillment Order'
const PURCHASE_ORDER_TYPE = 'Purchase Order'

const getQuery = (ago, isPrior = false) => {
  let timeCondition = `where salesforce.order.createddate ${
    isPrior ? '<' : '>'
  } now() - interval '${ago}'`

  return `
      select
        family as category,
        sum(quantity) as count,
        salesforce.recordType.name as type,
        salesforce.order.createddate as date
      from
        salesforce.orderItem
      inner join
        salesforce.product2
        ON salesforce.orderItem.product2id=product2.sfid
      inner join
        salesforce.order
            ON salesforce.orderItem.orderid=salesforce.order.sfid
      inner join
        salesforce.recordType
            ON salesforce.order.recordtypeid=salesforce.recordType.sfid
      ${timeCondition}
      group by
        salesforce.recordType.name,
        product2.family,
        salesforce.order.createddate,
        salesforce.order.sfid
      order by salesforce.order.createddate DESC
  `
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
      console.log('no pending orders')
      return
    }
    /*
    Creating a query to get all orders with pending id
     */
    let query = knex.select('sfid', 'id').from('salesforce.order')
    _.forEach(pendingOrders, (orderItemData, orderId) => {
      console.log('data', orderItemData, orderId)
      query.where('id', orderId)
    })

    query = query.toString()
    db.any(query)
      .then((orders) => {
        if (!orders || orders.length === 0) {
          return
        }

        let promises = []
        _.forEach(orders, (order) => {
          if (!order.sfid) {
            return
          }

          const orderItemDataList = pendingOrders[order.id]
          //Once synced then the information isn't needed
          delete pendingOrders[order.id]

          _.forEach(orderItemDataList, (orderItemData) => {
            let promise = getPricebookentry(
              db,
              orderItemData.categoryName
            ).then((pricebookentries) => {
              console.log('pricebookentries', pricebookentries)
              const entry = pricebookentries[0]
              return createOrderItem(db, orderItemData.count, order.sfid, entry)
            })

            promises.push(promise)
          })
        })
        return Promise.all(promises)
      })
      .then((orderItems) => {
        console.log('Order items were created:', orderItems)
      })
      .catch((e) => {
        console.log(e)
      })
  }, 5000)
}

const normalizeData = (rawData) => {
  let data = _.groupBy(rawData, 'category')

  _.forEach(data, (orders, categoryName) => {
    let orderTypes = _.groupBy(orders, 'type')
    const fCounts = _.sumBy(orderTypes[FULLFILLMENT_ORDER_TYPE], 'count')
    const pCounts = _.sumBy(orderTypes[PURCHASE_ORDER_TYPE], 'count')
    const demand = fCounts === 0 ? 0 : (pCounts / fCounts) * 100
    data[categoryName] = demand >= 100 ? 100 : demand
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

let contracts

const createOrder = (db) => {
  const contract = _.sample(contracts)

  let order = {
    effectivedate: moment().format('MM/DD/YYYY'),
    accountid: process.env.HEROKU_CONNECT_ACCOUNT_ID,
    contractid: contract.sfid,
    pricebook2id: contract.pricebook2id,
    status: 'Draft',
    recordtypeid: process.env.HEROKU_CONNECT_FULLFILLMENT_TYPE_ID
  }

  const createOrderQuery = knex('salesforce.order')
    .insert(order)
    .returning('*')
    .toString()
  console.log('order', createOrderQuery)
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
  console.log('runnig', getPricebookentryQuery)
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
  console.log('orderItem', query)
  return db.any(query)
}

const initRoutes = (app, NODB, db) => {
  app.get('/demand/data', (req, res) => {
    if (NODB) {
      return res.send('App running without a progres database.')
    }
    let i = 0
    let promises = []
    while (i <= CHART_VISIBLE_PAST_MINUTES) {
      promises.push(
        getData(db, getQuery(CHART_VISIBLE_PAST_MINUTES - i + ' minutes', true))
      )
      i++
    }
    Promise.all(promises)
      .then((list) => {
        let data = {}
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

  app.post('/demand/orders', (req, res) => {
    if (NODB) {
      return res.send('App running without a progres database.')
    }
    console.log(req.body)

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
        return createOrder(db)
      })
      .then((order) => {
        console.log('order', order)
        /*
          An order has been created but ithasn't been syned with salesforce at this point.
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

  db.any('select pricebook2id, sfid from salesforce.contract')
    .then((_contarcts) => {
      contracts = _contarcts
    })
    .catch((e) => {
      console.log(e)
    })
}

const init = (wss, db, NODB) => {
  if (NODB) {
    return console.log('App running without a progres database.')
  }

  const query = getQuery(DATA_PERIOD)

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
        }, 3000)
      })
  }

  setNextPromise()
  starOrderStatusCheckInterval(db)
}

module.exports = {
  initRoutes,
  init
}
