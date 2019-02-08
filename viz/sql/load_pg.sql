COPY ecommercelogs (time, session, action, product, category, campaign) FROM 'fixture.sql' DELIMITER ',' CSV HEADER;
