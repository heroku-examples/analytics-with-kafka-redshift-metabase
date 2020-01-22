# Example Product/User Analytics System Using Apache Kafka, AWS Redshift, and Metabase

**This app also includes** [Heroku Connect Data Demo](#heroku-connect-data-demo)

This is an example of a system that captures a large stream of product usage data, or events, and provides both real-time data visualization and SQL-based data analytics. The stream of events is captured by [Apache Kafka](https://kafka.apache.org/) and made available to other downstream consumers. In this example, there are two downstream consumers of the data. The data flowing through Kafka can be viewed in near real-time using a web-based data visualization app. The other consumer stores all the data in [AWS Redshift](https://aws.amazon.com/redshift/), a relational database that Amazon describes as "a fast, scalable data warehouse." Then we can query and visualize the data in Redshift from a SQL-compliant analytics tool. This example uses [Metabase deployed to Heroku](https://elements.heroku.com/buttons/metabase/metabase-deploy). [Metabase](https://www.metabase.com/) is an open-source analytics tool used by many organizations, large and small.

**This entire system can be deployed in 15 minutes -- most of that time spent waiting for Heroku and AWS to provision services -- and it requires very little ongoing operational maintenance.**

Here's an overview of how the system works.

<p align="center">
  <img src="docs/kafka-stream-viz-architecture.gif" width="75%" />
</p>

## Structure

This project includes 3 apps:

1. A data producer called `generate_data`. Data is simulated in this example, but this could be replaced with almost anything that produces data: a marketing website, a SaaS product, a point-of-sale device, a kiosk, internet-connected thermostat or car. And more than one data producer can be added.
1. A real-time data visualizer called `viz`, which shows relative volume of different categories of data being written into Kafka.
1. And a Kafka-to-Redshift writer called `reshift_batch`, which simply reads data from Kafka and writes it to Redshift.

They all share data using [Apache Kafka on Heroku](https://www.heroku.com/kafka).

You can optionally deploy Metabase to Heroku to query Redshift. Check out [Metabase's Heroku Deploy Button](https://elements.heroku.com/buttons/metabase/metabase).

## Deploy

### Prerequisites

- An AWS Redshift cluster. Check out [this Terraform script](https://github.com/heroku-examples/terraform-heroku-peered-redshift) for an easy way to create a Redshift cluster along with a Heroku Private Space and a private peering connection between the Heroku Private Space and the Redshift's AWS VPC. _Not free! This will incur cost on AWS and Heroku._
- Node.js

### Deploy to Heroku

```shell
git clone git@github.com:heroku-examples/kafka-stream-viz.git
cd kafka-stream-viz
heroku create
heroku addons:create heroku-kafka:basic-0
heroku kafka:topics:create ecommerce-logs
heroku kafka:consumer-groups:create redshift-batch
heroku config:set KAFKA_TOPIC=ecommerce-logs
heroku config:set KAFKA_CMD_TOPIC=audience-cmds
heroku config:set KAFKA_WEIGHT_TOPIC=weight-updates
heroku config:set KAFKA_QUEUE_TOPIC=queue-length
heroku config:set KAFKA_QUEUE_WORKER=queue-worker
heroku config:set KAFKA_CONSUMER_GROUP=redshift-batch
heroku config:set FIXTURE_DATA_S3='s3://aws-heroku-integration-demo/fixture.csv'
git push heroku master
```

Alternatively, you can use the Heroku Deploy button:

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

And then create the necessary Kafka topic and consumer group:

```shell
heroku kafka:topics:create ecommerce-logs #this can also be created at https://data.heroku.com/
heroku kafka:topics:create audience-cmds #this can also be created at https://data.heroku.com/
heroku kafka:topics:create weight-updates #this can also be created at https://data.heroku.com/
heroku kafka:topics:create queue-length #this can also be created at https://data.heroku.com/
heroku kafka:consumer-groups:create redshift-batch
```

Optionally, you can deploy Metabase to Heroku and use SQL to query and visualize data in Redshift. Use [Metabase's Heroku Deploy button](https://elements.heroku.com/buttons/metabase/metabase). Once deployed, you'll need to configure Metabase with the Redshift cluster URL, database name, username, and password.

### Deploy Locally

```shell
git clone git@github.com:heroku-examples/kafka-stream-viz.git
npm i
```

## Run

The following environment variables must be defined. If you used the Heroku deploy instructions above, all of the variables are already defined except for `DATABASE_URL`.

- `DATABASE_URL`: Connection string to an AWS Redshift cluster
- `FIXTURE_DATA_S3`: S3 path to CSV of fixture data to load into Redshift before starting data stream through Kafka (e.g. s3://aws-heroku-integration-demo/fixture.csv)
- `KAFKA_URL`: Comma-separated list of Apache Kafka broker URLs
- `KAFKA_CLIENT_CERT`: Contents of the client certificate (in PEM format) to authenticate clients against the broker
- `KAFKA_CLIENT_CERT_KEY`: Contents of the client certificate key (in PEM format) to authenticate clients against the broker
- `KAFKA_TOPIC`: Kafka topic the system will produce to and consume from
- `KAFKA_CMD_TOPIC`: Kafka topic the system will read audience cmds from
- `KAFKA_WEIGHT_TOPIC`: Kafka topic the system will produce category weight updates to
- `KAFKA_QUEUE_TOPIC`: Kafka topic the system will produce queue length updates to
- `KAFKA_QUEUE_WORKER`: Kafka topic the system will produce queue worker processing updates to
- `KAFKA_CONSUMER_GROUP`: Kafka consumer group name that is used by `redshift_batch` process type to write to Redshift.
- `KAFKA_PREFIX`: (optional) This is only used by [Heroku's multi-tenant Apache Kafka plans](https://devcenter.heroku.com/articles/multi-tenant-kafka-on-heroku) (i.e. `basic` plans)

Then in each of the `generate_data`, `viz`, and `redshift_batch` directories, run `npm start`.

Open the URL in the startup output of the `viz` app. It will likely be `http://localhost:3000`.

## Heroku Connect Data Demo

**This is an addition to the project above and not required to run**

This is an example project of showing how Salesforce and Heroku Postgres can be synced using [Heroku Connect](https://www.heroku.com/connect).

Please setup your Salesforce and Heroku Connect following [this documentation](./HerokuConnect.md).

## Data Demo Structure

This project uses `viz` for the web interface to show the chart that represents supply and demand using `fulfillment order` and `purchase order` of products in specific categories in Salesforce.
This project also uses a `generate_orders` which is a worker automatically creating orders periodically.

`generate_orders` creates orders and the `viz` shows the demand chart.

This project add new routes `/connect` and `/ordercontrol` to the viz app.
`/connect` show the demand chart and `/ordercontrol` gives you UI to control the `generate_orders`.

The detail of `generate_orders` can be found [here](./generate_orders/README.md).

## Deploy Data Demo

### Data Demo Prerequisites

This project is an addition to the existing project above so make sure you have everything running first.
Following items are needed:
- Salesforce account
- Postgres add-on
- Redis add-on
- Heroku Connect

You can install Posgres and Redis add-ons by runnning these:
```
heroku addons:create heroku-postgresql:<PLAN_NAME>
heroku addons:create heroku-redis:<PLAN_NAME>
```

Conneting your Heroku Postgres and Salesforce, please check [this instruction](https://devcenter.heroku.com/articles/getting-started-with-heroku-and-connect-without-local-dev).

### Deploy Data Demo to Heroku

This app is automatically deployed together with the main project.
**However, it requires additional environment variables and those add-ons above.**

### Environment Variables

These variables need to be set to run the app.
Most of them are from Salesforce.

- `HEROKU_CONNECT_FULFILLMENT_TYPE_ID`: The id of fulfillment order type
- `REDIS_URL`: Redis' endpoint url with credentials. [https://devcenter.heroku.com/articles/heroku-redis#redis-credentials](https://devcenter.heroku.com/articles/heroku-redis#redis-credentials)

### New Routes

You can access these locally and from the Heroku app.

- `/connect` This route shows the chart
- `/ordercontrol`  please check the detail from [here](./generate_orders/README.md).

