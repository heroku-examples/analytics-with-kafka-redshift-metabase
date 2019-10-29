import '../styles/style.css'

import Stream from './lib/stream'
import Queue from './lib/queue'
import Nav from './lib/nav'
import { MAX_SIZE, MAX_BUFFER_SIZE, INTERVAL } from '../consumer/constants'
import AudienceControl from './lib/audienceControls'
import BoothController from './lib/boothControls'
import DemandControls from './demand/DemandControls'
import ReconnectingWebSocket from 'reconnecting-websocket'

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
  y: 'processingTime',
  maxSize: MAX_BUFFER_SIZE,
  maxDisplaySize: MAX_SIZE
})

const AudienceControls = new AudienceControl({})
const BoothControls = new BoothController({ selector: '.big-button' })

const demandControls = new DemandControls({
  chartSelector: '#demand-chart',
  formOpenSelector: '.demand--fullfillment-button'
})

const url = `ws${window.location.href.match(/^http(s?:\/\/.*)\/.*$/)[1]}`
const ws = new ReconnectingWebSocket(url, null, {
  reconnectInterval: 1000,
  reconnectDecay: 1
})

window.ws = ws

aggregate.forEach((a) => a.init())
AudienceControls.init(ws)
BoothControls.init(ws)
QueueGraph.init()
demandControls.init(ws)

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
