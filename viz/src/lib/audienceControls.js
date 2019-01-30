// {
//   "type": "cmd",
//   "cmd": "weight",
//   "category": "XFLK",
//   "change": 1, // or -1
// }
export default class AudienceControl {
  constructor() {
    this.ws = null

    // this.init = this.init.bind(this)
  }
  change({ category, type }) {
    this.ws.send(
      JSON.stringify({
        type: 'cmd',
        cmd: 'weight',
        category: category,
        change: type === 'increment' ? 1 : -1
      })
    )
  }

  makeCategoryControl({ category, weight, totalProducts }) {
    const wrapper = document.querySelector('.category-controls-wrapper')
    const section = document.createElement('section')
    const minusButton = document.createElement('button')
    const plusButton = document.createElement('button')
    const progressBarWrapper = document.createElement('div')
    const progressBar = document.createElement('progress')
    const categoryName = document.createElement('h2')

    if (!wrapper) return

    section.classList.add('category-controls', category)

    minusButton.classList.add('minus')
    plusButton.classList.add('plus')
    minusButton.innerHTML = '<img src="/public/images/remove-mark-28.svg">'
    plusButton.innerHTML = '<img src="/public/images/add-mark-28.svg">'

    plusButton.onclick = () => this.change({ category, type: 'increment' })
    minusButton.onclick = () => this.change({ category, type: 'decrement' })

    categoryName.textContent = category
    progressBarWrapper.classList.add('progress-bar')
    progressBarWrapper.appendChild(categoryName)
    progressBar.setAttribute('max', '100')
    progressBar.setAttribute('value', weight)
    progressBarWrapper.appendChild(progressBar)

    section.appendChild(minusButton)
    section.appendChild(plusButton)
    section.appendChild(progressBarWrapper)

    // If we've already initialized and have all the nodes then this is an update
    // Re-render the wrapper
    if (wrapper.children.length === totalProducts) {
      wrapper.innerHTML = ''
    }
    wrapper.appendChild(section)
  }

  update(msg) {
    if (msg.type === 'weights') {
      const categoryKeys = Object.keys(msg.weights)
      categoryKeys.forEach((cat) =>
        this.makeCategoryControl({
          category: cat,
          weight: msg.weights[cat],
          totalProducts: categoryKeys.length
        })
      )
    }
  }

  init(ws) {
    this.ws = ws
    this.ws.onopen = () => {
      this.ws.send(JSON.stringify({ type: 'cmd', cmd: 'weight' }))
    }
  }
}
// "{ 'type': 'cmd', cmd: 'weight'}"
