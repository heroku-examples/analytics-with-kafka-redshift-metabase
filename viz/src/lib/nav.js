const kafkaConfig = require('../../../generate_data/kafka')

module.exports = class Nav {
  constructor(options) {
    this.legend = document.querySelector(options.legend)
    this.architectureLink = document.querySelector(options.architecture)
    this.main = document.querySelector('main')
    this.architectureFrame = document.querySelector('.architecture-iframe')

    if (this.architectureLink) {
      this.architecture()
    }
    this.toggleView()
  }

  formatData(data) {
    return Object.keys(data)
  }

  architecture() {
    this.architectureLink.addEventListener('click', () => {
      const toggleables = document.querySelectorAll('.toggleable')
      const isOpen = this.main.classList.contains('open')
      if (isOpen) {
        this.architectureFrame.removeAttribute('src')
        this.main.classList.remove('open')
      } else {
        this.architectureFrame.setAttribute(
          'src',
          '/public/kafka-diagram/kafka-diagram-v2.html'
        )
        this.main.classList.add('open')
      }
      toggleables.forEach((toggleable) => {
        if (toggleable.classList.contains('show')) {
          toggleable.classList.remove('show')
        }
      })
    })
  }

  toggleView() {
    const toggleLinks = document.querySelectorAll('.toggle')
    toggleLinks.forEach((toggleLink) => {
      toggleLink.addEventListener('click', (event) => {
        const currentLink = event.currentTarget.getAttribute('name') // toggle button
        const currentToggleable = document.querySelector(
          `.toggleable[name="${currentLink}"]`
        ) // element to toggle
        const isShown = currentToggleable.classList.contains('show')
        const isOpen = this.main.classList.contains('open') // if this is true, then the architecture diagram is open and we need to close it
        if (isShown) {
          currentToggleable.classList.remove('show')
        } else {
          currentToggleable.classList.add('show')
          if (isOpen) {
            this.architectureFrame.removeAttribute('src')
            this.main.classList.remove('open')
          }
        }
      })
    })
  }

  init() {}

  update(data) {
    if (!this.architectureLink) return
    this.formatData(data).forEach((topic, index) => {
      if (!this.legend.querySelector(`#topic-${topic}`)) {
        const li = document.createElement('li')
        li.textContent = kafkaConfig.categories[topic].name
        li.setAttribute('id', `topic-${topic}`)
        li.classList.add(`color-${index + 1}`)
        this.legend.appendChild(li)
      }
    })
  }
}
