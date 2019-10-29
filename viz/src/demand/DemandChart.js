import axios from 'axios'
import _ from 'lodash'
import moment from 'moment'
import Chart from 'chart.js'
import 'chartjs-plugin-streaming'
import demandConstants from './demandConstants'

export default class DemandChart {
  constructor(options) {
    this.categories = options.categories
    this.render(this.generateDatasets(options.originalData || {}))
  }

  getAllOrders() {
    return axios.get('/supplydemand/orders')
  }

  onRefresh() {
    if (!this.newData) {
      return
    }
    this.chart.config.data.datasets.forEach((dataset) => {
      let clone = _.clone(dataset.data)
      clone.push({
        x: Date.now(),
        y: this.newData[dataset.label] || dataset.data[dataset.data.length - 1]
      })
      //clone[0].y += _.sample([-1, 1]) * Math.floor(Math.random() * 3)
      dataset.data = _.reverse(_.sortBy(clone, 'x'))
    })
  }

  generateDatasets(originalData) {
    const chartColors = demandConstants.COLOR_LIST
    const color = Chart.helpers.color

    return this.categories.map((categoryName, index) => {
      let currentData = originalData[categoryName].map((value, i) => {

        return {
          x: moment()
            .subtract(originalData[categoryName].length - i, 'minute')
            .valueOf(),
          y: value
        }
      })
      //adding one more data value to the end so it looks continuous
      currentData.push({
        x: moment().valueOf(),
        y: currentData[currentData.length - 1].y
      })

      return {
        label: categoryName,
        backgroundColor: color(chartColors[index])
          .alpha(0.5)
          .rgbString(),
        borderColor: chartColors[index],
        borderWidth: 10,
        fill: false,
        lineTension: 0,
        data: currentData
      }
    })
  }

  render(datasets) {
    let config = {
      type: 'line',
      data: {
        datasets: datasets
      },
      options: {
        responsive: true,
        elements: {
          point: {
            radius: 0
          }
        },
        legend: {
          display: false
        },
        title: {
          display: false
        },
        scales: {
          xAxes: [
            {
              gridLines: {
                display: false
              },
              type: 'realtime',
              display: false,
              realtime: {
                duration: 300000,
                refresh: 10000,
                delay: 10000,
                onRefresh: this.onRefresh.bind(this)
              }
            }
          ],
          yAxes: [
            {
              display: false,
              ticks: {
                display: false,
                stepSize: 100,
                beginAtZero: true,
                max: 100
              }
            }
          ]
        },
        tooltips: {
          enabled: false
        }
      }
    }

    const ctx = document.getElementById('demand-chart').getContext('2d')
    this.chart = new Chart(ctx, config)
  }

  updateChart() {
    this.chart.load({
      columns: this.chartData.data
    })
  }

  getChartData() {
    return axios.get('/demand/data')
  }

  /**
   *
   * new data is coming from the server
   */
  update(newData) {
    // console.log(newData)
    if (!this.chart) {
      return
    }
    //console.log(newData)
    this.newData = newData
  }
}
