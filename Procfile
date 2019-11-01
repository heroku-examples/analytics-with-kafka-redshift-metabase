redshift_batch: cd redshift_batch && node index.js
web: cd viz && npm run start
dataworker: cd generate_data && node index.js -c kafka.js
mq_broker: cd mq_broker && node index.js
mq_worker: cd mq_worker && node index.js
order_maker: cd generate_orders && node index.js