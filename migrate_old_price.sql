-- Run ONCE on an existing database (Cloudflare dashboard > D1 > Console). Fresh databases already have this column in schema.sql.
ALTER TABLE products ADD COLUMN old_price INTEGER DEFAULT 0;
