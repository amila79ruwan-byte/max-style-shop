-- Full schema for a fresh D1 database (Cloudflare dashboard > D1 > Console, or: wrangler d1 execute <DB> --file=schema.sql)
-- Existing databases: run migrate_security.sql instead (adds phone_norm + customer_id to orders).

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  cat TEXT NOT NULL,
  image TEXT,
  sizes TEXT DEFAULT '',
  colors TEXT DEFAULT '',
  description TEXT DEFAULT '',
  size_chart TEXT DEFAULT '',
  stock INTEGER,                      -- NULL = not tracked
  feat_order INTEGER DEFAULT 0,       -- home slider position 1-15, 0 = hidden
  offer INTEGER DEFAULT 0,
  old_price INTEGER DEFAULT 0,        -- price before the offer (shown crossed out); 0 = none
  updated INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  image TEXT NOT NULL,
  pos INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_photos_product ON product_photos(product_id);

CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image TEXT NOT NULL,
  text TEXT DEFAULT '',
  link TEXT DEFAULT '',
  pos INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pay_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,                 -- bank | online
  title TEXT NOT NULL,
  details TEXT DEFAULT '',
  sort INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone2 TEXT,
  district TEXT DEFAULT '',
  address TEXT DEFAULT '',
  pin_hash TEXT NOT NULL,
  token TEXT,
  token_exp INTEGER DEFAULT 0,
  created INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_customers_token ON customers(token);

CREATE TABLE IF NOT EXISTS addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  name TEXT, phone TEXT, phone2 TEXT,
  district TEXT, city TEXT, postal TEXT, address TEXT,
  is_default INTEGER DEFAULT 0,
  created INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_addresses_customer ON addresses(customer_id);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,   -- order code = MS-(1000+id)
  name TEXT, phone1 TEXT, phone2 TEXT,
  phone_norm TEXT DEFAULT '',             -- last 9 digits of phone1 (digits only)
  customer_id INTEGER DEFAULT 0,          -- signed-in customer who placed it (0 = guest)
  district TEXT, address TEXT,
  items TEXT NOT NULL,                    -- JSON
  total INTEGER, subtotal INTEGER, discount INTEGER DEFAULT 0,
  delivery_fee INTEGER DEFAULT 0, cod_fee INTEGER DEFAULT 0,
  status TEXT DEFAULT 'received',
  created INTEGER,
  payment TEXT DEFAULT 'cod',             -- cod | bank | online
  pay_state TEXT DEFAULT 'none',          -- none | awaiting
  pay_method_id INTEGER DEFAULT 0,
  is_gift INTEGER DEFAULT 0, gift_wrap INTEGER DEFAULT 0, gift_msg TEXT DEFAULT '',
  sender_name TEXT DEFAULT '', sender_phone TEXT DEFAULT '', hide_sender INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_orders_phone_norm ON orders(phone_norm);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created);

CREATE TABLE IF NOT EXISTS login_attempts (
  k TEXT PRIMARY KEY,
  n INTEGER DEFAULT 0,
  locked_until INTEGER DEFAULT 0,
  updated INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS installs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created INTEGER
);

CREATE TABLE IF NOT EXISTS order_slips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  image TEXT NOT NULL,                    -- payment slip photo (data URL), shown to the admin only
  created INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_slips_order ON order_slips(order_id);
