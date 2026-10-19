PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  isbn TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Book',
  description TEXT NOT NULL DEFAULT '',
  condition TEXT NOT NULL DEFAULT 'Good',
  price REAL NOT NULL DEFAULT 0,
  msrp REAL NOT NULL DEFAULT 0,
  stock_mode TEXT NOT NULL DEFAULT 'unique',
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'in_stock',
  zone TEXT NOT NULL DEFAULT 'rear_restricted',
  location TEXT NOT NULL DEFAULT '',
  review_status TEXT NOT NULL DEFAULT 'needs_partner_review',
  online_published INTEGER NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL DEFAULT '',
  item_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_public ON products (online_published, status, category);
CREATE INDEX IF NOT EXISTS idx_products_title ON products (title);
CREATE INDEX IF NOT EXISTS idx_products_zone ON products (zone, review_status);
CREATE INDEX IF NOT EXISTS idx_products_isbn ON products (isbn);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled',
  customer_json TEXT NOT NULL,
  items_json TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  shipping REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  inventory_reserved INTEGER NOT NULL DEFAULT 1,
  notes TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  ip_hash TEXT PRIMARY KEY,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  window_started_ms INTEGER NOT NULL
);
