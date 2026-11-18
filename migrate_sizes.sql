-- Run ONCE on the existing D1 database (Cloudflare dashboard > D1 > Console),
-- to add the sizes column to products that already exist.
ALTER TABLE products ADD COLUMN sizes TEXT DEFAULT '';
