
# generate_orders

This worker creates both fulfillment and purchase orders periodically.

## Development Setup

### Requirements

- Heroku connect
- Heroku Postgres

### Nodejs setup

```shell
npm install
```

### Environment variables

You can find these variables on Salesforce

- `HEROKU_CONNECT_ACCOUNT_ID`: The accout id that's associated with the contract
- `HEROKU_CONNECT_FULFILLMENT_TYPE_ID`: The id of fulfillment order type
- `HEROKU_CONNECT_PURCHASE_YPTE_ID`: The id of purchase order type
- `HEROKU_CONNECT_PRICEBOOK_ID`: Pricebook id that's connected with all products
- `REDIS_URL`: Redis' endpoint url with credentials. [https://devcenter.heroku.com/articles/heroku-redis#redis-credentials](https://devcenter.heroku.com/articles/heroku-redis#redis-credentials)

### Development Server

```shell
node index.js
```

## How to start/stop/reset order creation process

It's using Redis and you can send a command to channel `generate_orders`.
`command` takes `start`, `stop`, or `reset`.
The format is:

```
{
  type: 'command',
  value: {'startt'|'stop'|'reset'}
}
```

- **start** starts making new orders
- **stop** stops the process
- **reset** also stops the process then starts deleting all rows.

### User interface

You can run `viz` and go to `/ordercontrol` and you will see three buttons with start, stop, and delete all(reset).
By pressing these buttons, you can send commands to this woker.

#### Logs shows the current state of the worker

The logs section of the Heroku dashboard should show what this worker is doing.
The worker's name is `order_maker` in the log.
So if you want to test this, open this log and the UI.
