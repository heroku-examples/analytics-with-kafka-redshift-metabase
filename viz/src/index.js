import '../styles/style.css'

import Stream from './lib/stream'
import Queue from './lib/queue'
import Nav from './lib/nav'
import { MAX_SIZE, MAX_BUFFER_SIZE, INTERVAL } from '../consumer/constants'
import AudienceControl from './lib/audienceControls'
import BoothController from './lib/boothControls'
import ReconnectingWebSocket from 'reconnecting-websocket'

console.log(MAX_SIZE, MAX_BUFFER_SIZE, INTERVAL)

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

const QueueGraph = new Queue({
  selector: '.chart-line .chart',
  countSelector: '.chart-line .queue-count',
  transition: INTERVAL,
  x: 'time',
  y: 'length',
  maxSize: MAX_BUFFER_SIZE,
  maxDisplaySize: MAX_SIZE
})
const AudienceControls = new AudienceControl({})
const BoothControls = new BoothController({ selector: '.big-button' })

const url = `ws${window.location.href.match(/^http(s?:\/\/.*)\/.*$/)[1]}`
const ws = new ReconnectingWebSocket(url)

window.ws = ws

aggregate.forEach((a) => a.init())
AudienceControls.init(ws)
BoothControls.init(ws)
QueueGraph.init()

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data)
  if (msg.type === 'weights') {
    AudienceControls.update(msg)
  } else if (msg.type === 'ecommerce') {
    aggregate.forEach((a) => a.update(msg.data))
  } else if (msg.type === 'queue') {
    QueueGraph.update(msg.data)
  }
}
