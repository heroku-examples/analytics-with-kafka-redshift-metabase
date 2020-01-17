import _ from 'lodash'
import axios from 'axios'
import DemandChart from './DemandChart'
import DemandFulfillmentForm from './DemandFulfillmentForm'
import demandConstants from './demandConstants'

export default class DemandControls {
  constructor(options) {
    if (document.querySelectorAll('.order-control-buttons').length > 0) {
      require('./order-control')()
    }

    const chartEl = document.querySelectorAll(options.chartSelector)[0]
    this.isDisabled = !chartEl
    if (this.isDisabled) {
      return
    }
    let chartData
    this.isAllReady = this.getCurrentChartData()
      .then((_chartData) => {
        chartData = _chartData
        return axios.get('/demand/chart-config')
      })
      .then((chartConfig) => {
        this.categories = chartConfig.data.CATEGORY_LIST
        console.log(this.categories)
        this.chart = new DemandChart({
          originalData: chartData.data,
          config: chartConfig.data
        })
        this.renderCategories()
        this.renderXticks()
        this.fulfillmentForm = new DemandFulfillmentForm({
          openButtonSelector: options.formOpenSelector,
          categories: this.categories
        })
      })
  }

  init(ws) {
    if (this.isDisabled) {
      return
    }
    this.isAllReady.then(() => {
      this.initUpdateCycle(ws)
    })
  }

  initUpdateCycle(ws) {
    ws.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'orders') {
        this.chart.update(msg.data)
      }
    })
  }

  initCategories() {
    return axios.get('/demand/categories').then((res) => {
      console.log(res)
      this.categories = res.data
    })
  }

  renderXticks() {
    let tickLabels = _.reverse(
      _.times(demandConstants.CHART_VISIBLE_MINS + 1, (x) => {
        return x === 0 ? 'Now' : x + 'mins'
      })
    )

    let template = _.template(`
      <% tickLabels.forEach( label => { %>
        <span class='demand-chart--x-tick'><%- label %></span>
      <% }); %>
    `)

    let html = template({
      tickLabels
    })

    document.querySelectorAll('.demand-chart--x-ticks')[0].innerHTML = html
  }

  renderCategories() {
    let template = _.template(`
      <ul class='demand-category'>
        <% categories.forEach((categoryName, index) => { %>
          <li>
          <span class='demand-category--color-box' 
                style='background-color: <%- colorList[index] %>'></span>
    <%- categoryName %>
          </li>
        <% }); %>
      </ul>
    `)

    let html = template({
      categories: this.categories,
      colorList: demandConstants.COLOR_LIST
    })
    document.querySelectorAll('.demand-category-container')[0].innerHTML = html
  }

  getCurrentChartData() {
    return axios.get('/demand/data', {
      params: {
        period: demandConstants.CHART_VISIBLE_MINS
      }
    })
  }

  initCategorySelectList() {
    let categorySelection = document.querySelectorAll(
      'select.co--field-input'
    )[0]
    categorySelection.innerHTML = ''
    this.categories.forEach((categoryName) => {
      let option = document.createElement('option')
      option.innerHTML = categoryName
      categorySelection.appendChild(option)
    })
  }
}
