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

  onRefresh() {
    if (!this.newData) {
      return
    }
    this.chart.config.data.datasets.forEach( dataset => {
      let clone = _.clone(dataset.data)
      clone.push({
        x: Date.now(),
        y: this.newData[dataset.label] || 0 //dataset.data[dataset.data.length - 1]
      })
      console.log()
      dataset.data = _.reverse(_.sortBy(clone, 'x'))
    })
  }

  generateDatasets(originalData) {
    let chartColors = demandConstants.COLOR_LIST

    // chartColors = _.shuffle(chartColors)
    return this.categories.map((categoryName, index) => {
      originalData[categoryName] = originalData[categoryName] || [0]
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
        backgroundColor: chartColors[index],
        borderColor: chartColors[index],
        borderWidth: demandConstants.CHART_LINE_THICKNESS,
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
        layout: {
          padding: {
            left: 0,
            right: 0,
            top: 20,
            bottom: 20
          }
        },
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
                duration: demandConstants.CHART_DURATION,
                refresh: demandConstants.CHART_REFRESH_DURATION,
                delay: demandConstants.CHART_DELAY,
                onRefresh: this.onRefresh.bind(this)
              }
            }
          ],
          yAxes: [
            {
              gridLines: {
                // display: false
              },
              // display: false,
              ticks: {
                // display: false,
                // stepSize: 100,
                // beginAtZero: true,
                // max: 100
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

  /**
   *
   * new data is coming from the server
   */
  update(newData) {
    console.log(newData)
    if (!this.chart) {
      return
    }
    this.newData = newData
  }
}
