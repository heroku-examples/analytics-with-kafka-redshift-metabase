import _ from 'lodash'
import axios from 'axios'
import DemandChart from './DemandChart'
import DemandFullfillmentForm from './DemandFullfillmentForm'
import demandConstants from './demandConstants'

export default class DemandControls {
  constructor(options) {
    const chartEl = document.querySelectorAll(options.chartSelector)[0]
    this.isDisabled = !chartEl
    if (this.isDisabled) {
      return
    }
    this.isAllReady = this.getCurrentChartData().then((res) => {
      this.categories = _.keys(res.data)
      this.chart = new DemandChart({
        originalData: res.data,
        categories: this.categories
      })
      this.renderCategories()
      this.fullfillmentForm = new DemandFullfillmentForm({
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
    return axios.get('/demand/data')
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

  initForm() {
    // const findEl = (selector) => {
    //   return document.querySelectorAll(selector)
    // }
    // const toggleModal = () => {
    //   modal.classList.toggle('co--modal__active')
    // }
    // let openModalBtn = findEl('.co--fullfillment-button')[0]
    // let modal = findEl('.co--modal')[0]
    // let form = findEl('.co--form')[0]
    // let addBtn = findEl('.co--add-button')[0]
    // let listContainer = findEl('.co--fields-list-container')[0]
    // let listItemStr
    // let submitBtn = findEl('.co--submit-button')[0]
    // let categorySelection = findEl('select.co--field-input')[0]
    // openModalBtn.addEventListener('click', toggleModal)
    // form.addEventListener('submit',e => e.preventDefault())
    // submitBtn.addEventListener('click', () => {
    //   this.submitFullfillment()
    //     .then( (res) => {
    //       modal.classList.add('co-modal__success')
    //     }).catch(e => {
    //       console.log(e)
    //       modal.classList.add('co-modal__error')
    //     })
    // })
    // modal.addEventListener('click', e => {
    //   if (e.target === modal) {
    //     toggleModal()
    //   }
    // })
    // addBtn.addEventListener('click', e => {
    //   e.preventDefault()
    //   listItemStr = listItemStr || listContainer.innerHTML
    //   let div = document.createElement('div')
    //   div.innerHTML = listItemStr
    //   listContainer.appendChild(div.children[0])
    // })
  }

  submitFullfillment() {
    return axios.post('/supplydemand/orders', {
      test: 'test'
      // firstName: 'Fred',
      // lastName: 'Flintstone'
    })
  }
}
