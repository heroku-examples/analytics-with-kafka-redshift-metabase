const _ = require('lodash')
const moment = require('moment')
const config = require('config')
const logger = require('../logger')('generate_orders')

/*
  ORDER_QUANTITY_RANDOMNESS - adding randomness to the amount +- this value
  FULFILLMENT_ORDER_MULTIPLY - When it's a fulfillment order, this amount is multipled with this number
  FULFILLMENT_ORDER_RATIO - 1 in this amount will be the fulfilment order
*/

let deleting = false
let totallOrdersCreated = 0
let knex = null
let orderInterval = null

const getOrderCount = (isFulfillmentOrder) => {
  let count =
    config.ORDER_QUANTITY +
    _.sample([1, -1]) *
      Math.floor(Math.random() * config.ORDER_QUANTITY_RANDOMNESS)
  return parseInt(
    isFulfillmentOrder ? count * config.FULFILLMENT_ORDER_MULTIPLY : count
  )
}

const makeOrder = (category) => {
  const isFulfillmentOrder =
    Math.floor(Math.random() * 100) % config.FULFILLMENT_ORDER_RATIO === 0
  const amount = getOrderCount(isFulfillmentOrder)

  let order = {
    category,
    amount,
    approved: true,
    type: isFulfillmentOrder
      ? config.FULFILLMENT_ORDER_TYPE
      : config.PURCHASE_ORDER_TYPE,
    createdat: moment().toISOString()
  }
  totallOrdersCreated++

  return knex('orders')
    .insert(order)
    .returning('*')
}

const makeOrders = () => {
  let promise = Promise.resolve()
  let categoryClone = _.shuffle(config.CATEGORY_LIST).splice(
    Math.floor(Math.random() * config.CATEGORY_LIST.length)
  )

  _.forEach(categoryClone, (category) => {
    promise = promise.then(() => {
      return makeOrder(category)
    })
  })
  return promise
}

const init = ({ _knex }) => {
  knex = _knex
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
  orderInterval = setInterval(makeOrders, config.ORDER_INTERVAL)
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
