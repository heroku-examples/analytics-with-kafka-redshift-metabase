const axios = require('axios')

export default class SupplyDemandControls {
  constructor() {
    this.data = null
    this.getAllOrders()
  }

  getAllOrders() {
    axios.get('/supplydemand/orders').then((res) => {
      console.log(res.data)
    })
  }

  update(newData) {
    console.log(newData)
  }
}
