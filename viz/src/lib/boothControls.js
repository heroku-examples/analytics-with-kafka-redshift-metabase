import kafkaConfig from '../../../generate_data/kafka'
export default class BoothController {
  constructor(options) {
    this.button = document.querySelector(options.selector)

    this.init = this.init.bind(this)
    this.handleButtonClick = this.handleButtonClick.bind(this)
    this.currentScenario = 'no_sale'
  }

  handleButtonClick() {
    this.getRandomScenario()
    this.ws.send(
      JSON.stringify({
        type: 'cmd',
        cmd: 'scenario',
        name: this.currentScenario
      })
    )
    this.setSaleHeader()
  }

  addHandlers() {
    if (!this.button) return
    this.button.onclick = this.handleButtonClick
  }

  getRandomScenario() {
    const scenarios = Object.keys(kafkaConfig.scenarios)
    const getRandomNotCurrent = () => {
      const random = scenarios[Math.floor(Math.random() * scenarios.length)]
      if (random !== this.currentScenario) return random
      else return getRandomNotCurrent()
    }
    this.currentScenario = getRandomNotCurrent()
  }

  setSaleHeader() {
    document.querySelector(
      '.current-sale'
    ).textContent = this.currentScenario.split('_').join(' ')
  }

  init(ws) {
    this.ws = ws
    this.addHandlers()
  }
}
