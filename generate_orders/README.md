
# generate_orders

This worker creates both fullfillment and purchase orders periodically.

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
- `HEROKU_CONNECT_FULLFILLMENT_TYPE_ID`: The id of fulfillment order type
- `HEROKU_CONNECT_PURCHASE_YPTE_ID`: The id of purchase order type
- `HEROKU_CONNECT_PRICEBOOK_ID`: Pricebook id that's connected with all products

### Development Server

```shell
node index.js
```

## How to start/stop/reset order creation process

This worker creates a table `order_creation_command` in the database and start watching the table.
The tables takes `command` and `created_at`.
`command` takes `start`, `stop`, and `reset`.
`created_at` takes a date value.
When a new row is inserted with one of those three commands, this worker starts tasks based on it.

- **start** starts making new orders
- **stop** stops the process
- **reset** also stops the process then starts deleting all rows.

### User interface

Heroku assign only one port for a Node app so this worker doesn't have UI but `viz` app has one.
You can go to `/ordercontrol` and you will see three buttons with start, stop, and reset.
By pressing these buttons, you can send commands to this woker.

#### This UI doesn't show what this worker is doing

You can press those buttons and it will respond when it creates a row in the database but it doesn't mean the worker is runnig and you can't know from the interface.

#### Logs shows the current state of the worker

The logs section of the Heroku dashboard should show what this worker is doing.
The worker's name is `order_maker` in the log.
So if you want to test this, open this log and the UI.
