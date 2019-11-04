const _ = require('lodash')
const logger = require('../logger')('generate_orders')

const ORDER_INTERVAL = 120000
const PURCHASE_ORDER_RATIO = 0.55 //55% of orders will be purchase orders but it will be some what random
const ORDER_QUANTITY = 500
const ORDER_QUANTITY_RANDOMNESS = 100 //

let contractId = null
let pendingOrders = {}
let products = null
let totallOrdersCreated = 0
let orderInterval = null
let orderSyncCheckInterval = null
let knex = null

const deleteAll = () => {
  stopOrderInterval()
  logger.info('Updating the all orders to be draft')
  return knex('salesforce.order')
    .where('status', 'Activated')
    .returning('id')
    .update('status', 'Draft')
    .then((ids) => {
      console.log('Total count:', ids.length)
      let idCounts = ids.length
      if (idCounts === 0) {
        return Promise.resolve()
      }
      return new Promise((resolve) => {
        const check = () => {
          //checking if these orders are synced with salesforce.
          //Deleing orders when they are still Activated on salesforce, they don't get deleted there
          setTimeout(() => {
            logger.info('Checking if orders are synced')
            knex('salesforce.order')
              .whereIn('id', ids)
              .where('_hc_lastop', 'SYNCED')
              .returning('id')
              .then((_ids) => {
                console.log('Synced count:', _ids.length)
                if (_ids.length > 0 && _ids.length >= idCounts) {
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
      logger.info('all synced!')
      logger.info('Deleting all order items')
    })
    .then(() => {
      return knex('salesforce.orderitem').del()
    })
    .then(() => {
      logger.info('All order items have been deleted')
      logger.info('Deleting all orders')
      return knex('salesforce.order').del()
    })
    .then(() => {
      logger.info('All orders have been deleted')
    })
    .catch((e) => {
      logger.error('Error in deleteAll method', e)
    })
}

const getPurchaseOrderCount = () => {
  return (
    Math.round(ORDER_QUANTITY * PURCHASE_ORDER_RATIO) +
    _.sample([1, -1]) * Math.floor(Math.random() * ORDER_QUANTITY_RANDOMNESS)
  )
}

const makeOrdersForCategory = (productInfo) => {
  let puchaseOrderCount = getPurchaseOrderCount()
  let fulfillmentOrderCount = ORDER_QUANTITY - puchaseOrderCount
  let promises = []

  _.each(
    [
      process.env.HEROKU_CONNECT_FULFILLMENT_TYPE_ID,
      process.env.HEROKU_CONNECT_PURCHASE_YPTE_ID
    ],
    (typeId, index) => {
      let order = {
        effectivedate: new Date().toLocaleDateString('en-US'),
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
  logger.info('Making new ordres')
  let promises = []
  _.forEach(products, (productInfo) => {
    promises.push(makeOrdersForCategory(productInfo))
  })
  return Promise.all(promises)
}

const activateOrders = (orders) => {
  logger.info('Activating all orders')
  return knex('salesforce.order')
    .whereIn('sfid', _.map(orders, (order) => order.sfid))
    .update('status', 'Activated')
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

/*
  This interval will keep checking if new order has been created and it has been synced.
  If it's synced then it will create orderitems that's associted with.
  It's stored in "pendingOrders"
*/

const starOrderStatusCheckInterval = () => {
  let inProgress = false

  return setInterval(() => {
    if (_.keys(pendingOrders).length === 0 || inProgress) {
      return
    }
    inProgress = true
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
          inProgress = false
          return
        }
        orders = _orders
        return createAllPendingOrderItems(orders)
          .then(() => {
            logger.info('All order items for pending orders have been created')
            return activateOrders(orders)
          })
          .then(() => {
            inProgress = false
            totallOrdersCreated += orders.length
            logger.info('Successfully activated orders')
          })
      })
      .catch((e) => {
        inProgress = false
        logger.error(e)
      })
  }, 5000)
}

const startOrderInterval = () => {
  stopOrderInterval()
  logger.info('Order creation interval started')
  makeOrders()
  orderInterval = setInterval(makeOrders, ORDER_INTERVAL)
  orderSyncCheckInterval = starOrderStatusCheckInterval()
}

const stopOrderInterval = () => {
  if (orderInterval) {
    clearInterval(orderInterval)
    orderInterval = null
  }
  if (orderSyncCheckInterval) {
    clearInterval(orderSyncCheckInterval)
    orderSyncCheckInterval = null
  }
  logger.info('Order creation interval stopped')
}

const getStatus = () => {
  return {
    running: !!orderInterval,
    state: orderInterval ? 'Running' : 'Stopped',
    interval: ORDER_INTERVAL,
    quantity: ORDER_QUANTITY,
    randomness: ORDER_QUANTITY_RANDOMNESS,
    purchaseRatio: PURCHASE_ORDER_RATIO,
    totallOrdersCreated,
    totalPendingOrders: _.keys(pendingOrders).length,
    isReady: !!contractId
  }
}

const init = ({ _knex, _contractId, _products }) => {
  knex = _knex
  contractId = _contractId
  products = _products
}

module.exports = {
  deleteAll,
  startOrderInterval,
  stopOrderInterval,
  getStatus,
  init
}
