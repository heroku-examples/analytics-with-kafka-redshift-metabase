// const moment = require('moment')
// const _ = require('lodash')

const getQuery = (ago = '10 minutes') => {
  return `
      select
        family as category,
        sum(quantity) as count,
        salesforce.recordType.name as type,
        salesforce.order.createddate as date,
        salesforce.order.sfid as orderId   
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
      where salesforce.order.createddate > now() - interval '${ago}'
      group by
        salesforce.recordType.name,
        product2.family,
        salesforce.order.createddate,
        salesforce.order.sfid
      order by salesforce.order.createddate DESC
  `
}

const normalizeData = (rawData) => {
  //Do something
  return rawData
}

const getData = (db, query) => {
  return db
    .any(query)
    .then((rawData) => {
      return normalizeData(rawData)
    })
    .catch((error) => console.error(`ERROR: ${error}`))
}

module.exports = {
  initRoutes: (app, NODB, db) => {
    app.get('/supplydemand/orders', (req, res) => {
      if (NODB) {
        return res.send('App running without a progres database.')
      }

      let ago = '1 week'
      const query = getQuery(ago)
      return getData(db, query).then((data) => {
        res.send(data)
      })
    })
  },

  initConnection: (wss, db, NODB) => {
    
    if (NODB) {
      return console.log('App running without a progres database.')
    }

    const query = getQuery()

    const sendData = (data) => {
      console.log(data)
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
          }, 5000)
        })
    }

    setNextPromise()
  }
}
