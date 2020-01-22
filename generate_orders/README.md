
# generate_orders

This worker creates both fulfillment and purchase orders periodically.

## How often and how many

It produces about 150 orders total every minute and it creates more puchase orders than fulfillment orders overtime.
Sometimes it creates more fulfillment orders in one period.

## Development Setup

### Requirements

- Heroku connect
- Heroku Postgres add-on
- Redis add-on

### Nodejs setup

```shell
npm install
```

### Environment variables

You can find the most of these variables on Salesforce

- `REDIS_URL`: Redis' endpoint url with credentials. [https://devcenter.heroku.com/articles/heroku-redis#redis-credentials](https://devcenter.heroku.com/articles/heroku-redis#redis-credentials)

### Development Server

```shell
node index.js
```

## How to start/stop/reset order creation process

By default, it's stopped.
The worker is subscribing to Redis and you can send a command to channel `generate_orders`.

`command` takes `start`, `stop`, or `reset`.

The format is:

```
{
  type: 'command',
  value: '{start|stop|reset}''
}
```

- **start** starts making new orders
- **stop** stops the process
- **reset** also stops the process then starts deleting all rows.

### User interface

You can run `viz` and go to `/ordercontrol` and you will see three buttons with start, stop, and delete all(reset).
By pressing these buttons, you can send commands to this woker.
There is a status text you can see to know what it's doing.

#### Logs shows the current state of the worker

The logs section of the Heroku dashboard should show what this worker is doing in detail.
The worker's name is `order_maker` in the log.
If you want to test this worker, open this log and the UI.
