const express = require('express')
const _ = require('lodash')
const moment = require('moment')
const app = express()
const port = 4000

const knex = require('knex')({
  client: 'pg',
  connection: `${process.env.DATABASE_URL}?ssl=true`
})

const ORDER_INTERVAL = 60000
const PURCHASE_ORDER_RATIO = 0.55 //55% of orders will be purchase orders but it will be some what random
const ORDER_QUANTITY = 500
const ORDER_QUANTITY_RANDOMNESS = 100 // +-

let products = null
let contractId = null
let pendingOrders = {}

console.log(process.env.DATABASE_URL)

// This is for the next update.
const deleteAll = () => {
  console.log('Updating the all orders to be draft')

  return knex('salesforce.order')
    .where('status', 'Activated')
    .returning('id')
    .update('status', 'Draft')
    .then((ids) => {
      console.log(ids)
      if (ids.length === 0) {
        return Promise.resolve()
      }
      return new Promise((resolve) => {
        const check = () => {
          //checking if these orders are synced with salesforce
          setTimeout(() => {
            console.log('Checking if orders are synced')
            knex('salesforce.order')
              .whereIn('id', ids)
              .where('_hc_lastop', 'SYNCED')
              .returning('id')
              .then((ids) => {
                if (ids.length > 0) {
                  resolve()
                } else {
                  check()
                }
              })
          }, 5000)
        }
        check()
      })
    })
    .then(() => {
      console.log('all synced!')
      console.log('Deleting all order items')
    })
    .then(() => {
      return knex('salesforce.orderitem').del()
    })
    .then(() => {
      console.log('All order items have been deleted')
      console.log('Deleting all orders')
      return knex('salesforce.order').del()
    })
    .then(() => {
      console.log('All orders have been deleted')
    })
    .catch((e) => {
      console.log('Error in deleteAll method', e)
    })
}

const getPurchaseOrderCount = () => {
  return (
    ORDER_QUANTITY * PURCHASE_ORDER_RATIO +
    _.sample([1, -1]) * Math.floor(Math.random() * ORDER_QUANTITY_RANDOMNESS)
  )
}

const makeOrdersForCategory = (productInfo) => {
  let puchaseOrderCount = getPurchaseOrderCount()
  let fulfillmentOrderCount = ORDER_QUANTITY - puchaseOrderCount
  let promises = []

  _.each(
    [
      process.env.HEROKU_CONNECT_FULLFILLMENT_TYPE_ID,
      process.env.HEROKU_CONNECT_PURCHASE_YPTE_ID
    ],
    (typeId, index) => {
      let order = {
        effectivedate: moment().format('MM/DD/YYYY'),
        accountid: process.env.HEROKU_CONNECT_ACCOUNT_ID,
        contractid: contractId,
        pricebook2id: process.env.HEROKU_CONNECT_PRICEBOOK_ID,
        status: 'Draft',
        recordtypeid: typeId
      }

      let promise = knex('salesforce.order')
        .insert(order)
        .returning('*')
        .then((orderData) => {
          pendingOrders[orderData[0].id] = pendingOrders[orderData[0].id] || []
          pendingOrders[orderData[0].id].push({
            categoryName: productInfo.category,
            count: index === 0 ? fulfillmentOrderCount : puchaseOrderCount
          })
        })

      promises.push(promise)
    }
  )

  return Promise.all(promises)
}

const makeOrders = () => {
  console.log('Started making new ordres')
  let promises = []
  _.forEach(products, (productInfo) => {
    promises.push(makeOrdersForCategory(productInfo))
  })
  return Promise.all(promises)
}

const activateOrders = (orders) => {
  return knex('salesforce.order')
    .whereIn('sfid', _.map(orders, (order) => order.sfid))
    .update('status', 'Activated')
}

/*
  This interval will keep checking if new order has been created and it has been synced.
  If it's synced then it will create orderitems that's associted with.
  It's stored in "pendingOrders"
*/
const starOrderStatusCheckInterval = () => {
  setInterval(() => {
    if (_.keys(pendingOrders).length === 0) {
      return
    }
    /*
    Creating a query to get all orders with pending id
     */
    let request = knex.select('sfid', 'id').from('salesforce.order')
    let ids = []
    let orders = null
    _.forEach(pendingOrders, (orderItemData, orderId) => {
      ids.push(orderId)
    })
    request.whereIn('id', ids).whereNotNull('sfid')

    request
      .then((_orders) => {
        if (!_orders || _orders.length === 0) {
          return
        }
        orders = _orders
        return createAllPendingOrderItems(orders)
          .then(() => {
            return activateOrders(orders)
          })
          .then(() => {
            console.log('Successfully created new orders')
          })
      })
      .catch((e) => {
        console.log(e)
      })
  }, 5000)
}

const createOrderItem = (count, orderid, productInfo) => {
  let orderItemData = {
    orderid: orderid,
    product2id: productInfo.product2id,
    unitprice: productInfo.unitprice,
    pricebookentryid: productInfo.pricebookEntryId,
    quantity: count
  }

  return knex('salesforce.orderitem')
    .insert(orderItemData)
    .returning('*')
}

const createAllPendingOrderItems = (orders) => {
  let promises = []
  _.forEach(orders, (order) => {
    if (!order.sfid) {
      return
    }
    const orderItemDataList = pendingOrders[order.id]
    //Once synced then the information isn't needed
    delete pendingOrders[order.id]

    _.forEach(orderItemDataList, (orderItemData) => {
      let promise = createOrderItem(
        orderItemData.count,
        order.sfid,
        _.find(products, { category: orderItemData.categoryName })
      )
      promises.push(promise)
    })
  })
  return Promise.all(promises)
}

const getProductList = () => {
  return knex
    .select(
      'pricebookentry.sfid as pricebookEntryId',
      'unitprice',
      'product2id',
      'family as category'
    )
    .from('salesforce.pricebookentry')
    .innerJoin(
      'salesforce.product2',
      'pricebookentry.product2id',
      '=',
      'product2.sfid'
    )
    .whereNotNull('family')
    .where(
      'pricebookentry.pricebook2id',
      process.env.HEROKU_CONNECT_PRICEBOOK_ID
    )
}

const getContractIds = () => {
  return knex
    .select('sfid as contractId')
    .from('salesforce.contract')
    .where('pricebook2id', process.env.HEROKU_CONNECT_PRICEBOOK_ID)
}

const init = () => {
  getProductList()
    .then((_products) => {
      products = _products
      return getContractIds()
    })
    .then((contractIds) => {
      contractId = contractIds[0].contractId
    })
    .then(() => {
      console.log('order generator ready')
      setInterval(makeOrders, ORDER_INTERVAL)
    })
    .then(() => {
      starOrderStatusCheckInterval()
    })
}

init()

app.get('/connect/delete-orders', (req, res) => {
  deleteAll()
    .then(() => {
      res.send('All orders were deleted')
    })
    .catch((e) => {
      console.log(e)
      res.status(500).send('Something went wrong')
    })
})

app.listen(port, () =>
  console.log(`Order generator listening on port ${port}!`)
)
