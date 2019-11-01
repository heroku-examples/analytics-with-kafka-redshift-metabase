# generate_orders

This worker creates orders periodically

## Development Setup

```shell
npm install
```

Additionally these environment variables need to be defined:

- `HEROKU_CONNECT_ACCOUNT_ID`: The accout id that's associated with the contract
- `HEROKU_CONNECT_FULLFILLMENT_TYPE_ID`: The id of fulfillment order type
- `HEROKU_CONNECT_PURCHASE_YPTE_ID`: The id of purchase order type
- `HEROKU_CONNECT_PRICEBOOK_ID`: Pricebook id that's connected with all products

### Development Server

```shell
node index.js
```
