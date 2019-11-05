import _ from 'lodash'
import moment from 'moment'
import Chart from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import 'chartjs-plugin-streaming'
import demandConstants from './demandConstants'

Chart.plugins.unregister(ChartDataLabels)

export default class DemandChart {
  constructor(options) {
    this.categories = options.categories
    this.render(this.generateDatasets(options.originalData || {}))
  }

  onRefresh() {
    this.newData = this.newData || {}
    this.chart.config.data.datasets.forEach((dataset) => {
      let clone = _.clone(dataset.data)
      clone.push({
        x: Date.now(),
        y:
          this.newData[dataset.label] || dataset.data[dataset.data.length - 1].y
      })
      dataset.data = _.reverse(_.sortBy(clone, 'x'))
    })
  }

  generateDatasets(originalData) {
    let chartColors = demandConstants.COLOR_LIST

    // chartColors = _.shuffle(chartColors)
    return this.categories.map((categoryName, index) => {
      originalData[categoryName] =
        originalData[categoryName] ||
        _.times(demandConstants.CHART_VISIBLE_MINS + 1, () => 0)
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
        lineTension: 0.2,
        data: currentData,
        datalabels: {
          color: chartColors[index]
        }
      }
    })
  }

  render(datasets) {
    let config = {
      plugins: [ChartDataLabels],
      type: 'line',
      data: {
        datasets: datasets
      },
      options: {
        plugins: {
          datalabels: {
            // clip: true,
            clamp: true,
            align: (context) => {
              let dataList = config.data.datasets[context.datasetIndex].data
              const curData = dataList[context.dataIndex]
              const nextData = dataList[context.dataIndex + 1]
              const prevData = dataList[context.dataIndex - 1]
              let align = 'top'

              if (prevData) {
                if (prevData.y > curData.y) {
                  align = 'bottom'
                }
              }

              if (nextData) {
                if (nextData.y > curData.y) {
                  align = 'bottom'
                }
              }
              return align
            },
            offset: 10,
            font: {
              size: 20
            },
            formatter: (value) => {
              return value.y
            }
          }
        },
        layout: {
          padding: {
            left: 0,
            right: 0,
            top: 40,
            bottom: 40
          }
        },
        aspectRatio: 3,
        responsive: true,
        maintainAspectRatio: true,
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
                display: false
              }
              // display: false,
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
