import '../styles/style.css'

import Stream from './lib/stream'
import Nav from './lib/nav'
import { MAX_SIZE, MAX_BUFFER_SIZE, INTERVAL } from '../consumer/constants'
import AudienceControl from './lib/audienceControls'

const aggregate = [
  new Nav({
    legend: '.footer-legend ul',
    architecture: '.architecture-link'
  }),
  new Stream({
    selector: '.chart-stream .chart',
    transition: INTERVAL,
    x: 'time',
    y: 'avgPerSecond',
    maxSize: MAX_BUFFER_SIZE,
    maxDisplaySize: MAX_SIZE
  })
]

const AudienceControls = new AudienceControl({})

const url = `ws${window.location.href.match(/^http(s?:\/\/.*)\/.*$/)[1]}`
const ws = new window.WebSocket(url)
window.ws = ws

aggregate.forEach((a) => a.init())
AudienceControls.init(ws)

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data)
  if (msg.type === 'weights') {
    AudienceControls.update(msg)
  } else if (msg.type === 'ecommerce') {
    aggregate.forEach((a) => a.update(msg.data))
  }
}
