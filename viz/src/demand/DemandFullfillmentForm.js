import axios from 'axios'
import _ from 'lodash'

export default class DemandFullfillmentForm {
  constructor(options) {
    this.cfg = this.getConfig(options)
    this.categories = options.categories
    this.initElements()
  }

  getConfig(options) {
    return Object.assign(
      {
        containerClass: 'demand-modal',
        containerSuccessClass: 'demand-modal__success',
        containerErrorClass: 'demand-modal__error',
        containerSendingClass: 'demand-modal__sending',
        fieldListContainerClass: 'demand-form--fields-list-container',
        addButtonClass: 'demand-form--add-button-container',
        openButtonSelector: '',
        submitButtonClass: 'demand-form--submit-button',
        modalActiveClass: 'demand-modal__active',
        orderFieldsContainerClass: 'demand-form--fields-container'
      },
      options
    )
  }

  initElements() {
    if (this.container) {
      document.body.removeChild(this.container)
    }

    this.container = document.createElement('div')
    this.container.classList.add(this.cfg.containerClass)

    let template = _.template(`
      <div class="demand-form-container">
        <h3 class="demand-modal--title">New Fullfillment</h3>
        <h3 class="demand-modal--title demand-modal--title__success">Your orders have been successfully submitted.</h3>
        <h3 class="demand-modal--title demand-modal--title__error">Error: Something went wrong</h3>
        <form class="demand-form">
          <div class="<%- fieldListContainerClass %>">
          </div>
          <div class="demand-form--add-button-container">
            <a class="<%- addButtonClass %>">Add another product</a>
          </div>
          <div class="demand-form--submit-button-container">
            <a class="demand-form--submit-button">Submit</a>
          </div>
        </form>
      </div>
    `)

    this.container.innerHTML = template({
      fieldListContainerClass: this.cfg.fieldListContainerClass,
      addButtonClass: this.cfg.addButtonClass
    })

    this.fieldsContainer = this.getElByClass(this.cfg.fieldListContainerClass)
    this.initEvents()
    this.appendNewField()
    document.body.append(this.container)
  }

  initEvents() {
    this.getElByClass(this.cfg.addButtonClass).addEventListener(
      'click',
      (e) => {
        e.preventDefault()
        this.appendNewField()
      }
    )

    this.getElByClass(this.cfg.submitButtonClass).addEventListener(
      'click',
      (e) => {
        e.preventDefault()
        this.sendOrders()
      }
    )

    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.container.classList.remove(this.cfg.modalActiveClass)
      }
    })

    document
      .querySelectorAll(this.cfg.openButtonSelector)[0]
      .addEventListener('click', (e) => {
        e.preventDefault()
        this.container.classList.add(this.cfg.modalActiveClass)
      })
  }

  sendOrders() {
    let items = this.container.querySelectorAll(
      '.' + this.cfg.orderFieldsContainerClass
    )
    let orderObj = {}

    _.forEach(items, (item) => {
      let category = item.querySelectorAll('select')[0].value
      let count = parseInt(item.querySelectorAll('input')[0].value)
      if (!isNaN(count) && count > 0) {
        orderObj[category] = orderObj[category] || 0
        orderObj[category] += count
      }
    })

    if (!_.keys(orderObj).length > 0) {
      alert('Please add at least one order')
      return
    }

    this.container.classList.add()

    return axios
      .post('/demand/orders', { orders: JSON.stringify(orderObj) })
      .then((res) => {
        this.container.classList.add(this.cfg.containerSuccessClass)
        this.closeAndClean()
        console.log(res)
      })
      .catch((e) => {
        this.container.classList.add(this.cfg.containerErrorClass)
        this.closeAndClean()
        console.error(e)
      })
  }

  closeAndClean(after = 2000) {
    setTimeout(() => {
      this.container.classList.remove(this.cfg.modalActiveClass)
      this.initElements()
    }, after)
  }

  appendNewField() {
    this.fieldsContainer.append(this.getNewField())
  }

  getNewField() {
    let template = _.template(`
      <div class="<%- orderFieldsContainerClass %>">
        <div class="demand-form--field-item demand-form--field-item-category">
          <label>Product category</label>
          <select
            class="demand-form--field-input">
            <% categories.forEach((categoryName, index) => { %>
              <option><%- categoryName %></option>
            <% }); %>
          </select>
        </div>
        <div class="demand-form--field-item demand-form--field-item-amount">
          <label>Amount</label>
          <input class="demand-form--field-input" type="number" value='0'  step='10' min='0' />
        </div>
      </div>
    `)

    return this.createElFromStr(
      template({
        categories: this.categories,
        orderFieldsContainerClass: this.cfg.orderFieldsContainerClass
      })
    )
  }

  getElByClass(Class) {
    return this.container.querySelectorAll('.' + Class)[0]
  }

  createElFromStr(str) {
    let container = document.createElement('div')
    container.innerHTML = str
    return container.firstElementChild
  }
}
