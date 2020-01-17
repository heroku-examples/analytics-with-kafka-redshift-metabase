const _ = require('lodash')
const moment = require('moment')

const logger = require('../logger')('generate_orders')

const ORDER_INTERVAL = 20000
const ORDER_QUANTITY = 50
const ORDER_QUANTITY_RANDOMNESS = 30 // +- 30
const FULFILLMENT_ORDER_MULTIPLY = 2 // When it's a fulfillment order, the amount is multipled with this number
const FULFILLMENT_ORDER_RATIO = 4 // About 1 in 3 orders will be fulfillment orders
const FULFILLMENT_ORDER_TYPE = 'Fulfillment Order'
const PURCHASE_ORDER_TYPE = 'Purchase Order'

let deleting = false
let totallOrdersCreated = 0
let CATEGORY_LIST = null
let knex = null
let orderInterval = null

const getOrderCount = (isFulfillmentOrder) => {
  let count =
    ORDER_QUANTITY +
    _.sample([1, -1]) * Math.floor(Math.random() * ORDER_QUANTITY_RANDOMNESS)
  return parseInt(
    isFulfillmentOrder ? count * FULFILLMENT_ORDER_MULTIPLY : count
  )
}

const makeOrder = (category) => {
  const isFulfillmentOrder =
    Math.floor(Math.random() * 100) % FULFILLMENT_ORDER_RATIO === 0
  const amount = getOrderCount(isFulfillmentOrder)

  let order = {
    category,
    amount,
    approved: true,
    type: isFulfillmentOrder ? FULFILLMENT_ORDER_TYPE : PURCHASE_ORDER_TYPE,
    createdat: moment().toISOString()
  }
  totallOrdersCreated++

  return knex('orders')
    .insert(order)
    .returning('*')
}

const makeOrders = () => {
  let promise = Promise.resolve()
  let categoryClone = _.shuffle(CATEGORY_LIST).splice(
    Math.floor(Math.random() * CATEGORY_LIST.length)
  )

  _.forEach(categoryClone, (category) => {
    promise = promise.then(() => {
      return makeOrder(category)
    })
  })
  return promise
}

const init = ({ _knex, _CATEGORY_LIST }) => {
  knex = _knex
  CATEGORY_LIST = _CATEGORY_LIST
}

const deleteAll = () => {
  stopOrderInterval()
  deleting = true
  return knex('orders')
    .del()
    .then(() => (deleting = false))
}

const startOrderInterval = () => {
  stopOrderInterval()
  orderInterval = setInterval(makeOrders, ORDER_INTERVAL)
  logger.info('Order creation interval started')
  makeOrders()
}

const stopOrderInterval = () => {
  if (orderInterval) {
    clearInterval(orderInterval)
    orderInterval = null
  }
  logger.info('Order creation interval stopped')
}

const getStatus = () => {
  let state
  if (deleting) {
    state = 'Deleting'
  } else if (orderInterval) {
    state = 'Running'
  } else {
    state = 'Stopped'
  }

  return {
    state,
    totallOrdersCreated
  }
}

module.exports = {
  deleteAll,
  startOrderInterval,
  stopOrderInterval,
  getStatus,
  init
}
