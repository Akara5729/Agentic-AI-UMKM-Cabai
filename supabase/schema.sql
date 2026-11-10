-- Script ini dijalankan di Supabase SQL Editor
-- Versi bersih, aman dijalankan ulang

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM TYPES (safe re-run)
DO $$ BEGIN
    CREATE TYPE order_status_enum AS ENUM (
        'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE fulfillment_method_enum AS ENUM (
        'PICKUP', 'DELIVERY_COURIER'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. STORE SETTINGS
CREATE TABLE IF NOT EXISTS store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name VARCHAR(100) NOT NULL DEFAULT 'UMKM Cabai Berkah',
    is_open BOOLEAN NOT NULL DEFAULT true,
    opening_hours VARCHAR(100) DEFAULT '07:00 - 17:00 WIB',
    address TEXT DEFAULT 'Jl. Pasar Sayur No. 12, Kios Blok C-05',
    payment_info TEXT DEFAULT 'BCA: 1234567890 a.n UMKM Cabai / QRIS tersedia di kios',
    stem_removal_fee_per_kg NUMERIC(10, 2) DEFAULT 2000.00,
    min_order_kg NUMERIC(5, 2) DEFAULT 0.5,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    current_price_per_kg NUMERIC(10, 2) NOT NULL,
    stock_kg NUMERIC(8, 2) NOT NULL DEFAULT 0.0,
    is_available BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ORDERS
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(30) UNIQUE NOT NULL,
    telegram_chat_id BIGINT NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_username VARCHAR(100),
    status order_status_enum NOT NULL DEFAULT 'PENDING',
    fulfillment_method fulfillment_method_enum NOT NULL DEFAULT 'PICKUP',
    pickup_time_estimate VARCHAR(100),
    total_amount NUMERIC(12, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    product_name_snapshot VARCHAR(100) NOT NULL,
    price_per_kg_snapshot NUMERIC(10, 2) NOT NULL,
    quantity_kg NUMERIC(6, 2) NOT NULL,
    stem_removed BOOLEAN NOT NULL DEFAULT false,
    stem_removal_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
    subtotal NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. BOT CONVERSATIONS (Telegram session memory)
CREATE TABLE IF NOT EXISTS bot_conversations (
    chat_id BIGINT PRIMARY KEY,
    conversation_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_interaction TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_telegram_chat_id ON orders(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_available ON products(is_available);

-- 9. ENABLE REALTIME (for Dashboard live updates)
-- Aktifkan Realtime untuk tabel orders agar dashboard dapat mendengarkan perubahan
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE store_settings;

-- 10. ROW LEVEL SECURITY (RLS) - Penting untuk keamanan
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read & update pada products (bot baca harga, dashboard update harga)
DROP POLICY IF EXISTS "Allow public read products" ON products;
CREATE POLICY "Allow public read products" ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public update products" ON products;
CREATE POLICY "Allow public update products" ON products FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public insert products" ON products;
CREATE POLICY "Allow public insert products" ON products FOR INSERT WITH CHECK (true);

-- Policy: Allow public read & update pada store_settings (bot baca status, dashboard update toko)
DROP POLICY IF EXISTS "Allow public read store_settings" ON store_settings;
CREATE POLICY "Allow public read store_settings" ON store_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public update store_settings" ON store_settings;
CREATE POLICY "Allow public update store_settings" ON store_settings FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public insert store_settings" ON store_settings;
CREATE POLICY "Allow public insert store_settings" ON store_settings FOR INSERT WITH CHECK (true);

-- Policy: Service role (backend/webhook) bisa SELECT dan INSERT orders
DROP POLICY IF EXISTS "Service role full access orders" ON orders;
CREATE POLICY "Service role full access orders" ON orders USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access order_items" ON order_items;
CREATE POLICY "Service role full access order_items" ON order_items USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access bot_conversations" ON bot_conversations;
CREATE POLICY "Service role full access bot_conversations" ON bot_conversations USING (true) WITH CHECK (true);

-- 11. SEED DATA AWAL
-- Insert store settings jika belum ada
INSERT INTO store_settings (store_name, is_open, opening_hours, address, payment_info, stem_removal_fee_per_kg, min_order_kg)
SELECT 'Toko Cabai Ibu Umi', true, '07:00 - 17:00 WIB', 'Jl. Pasar Bitingan Bawah', 'BCA: 1234567890 a.n Toko Cabai Ibu Umi / QRIS di Kios', 2000.00, 0.5
WHERE NOT EXISTS (SELECT 1 FROM store_settings LIMIT 1);

-- Insert 5 varian cabai populer
INSERT INTO products (name, slug, current_price_per_kg, stock_kg, is_available, description) VALUES
    ('Cabai Rawit Merah',      'cabai-rawit-merah',    45000.00, 35.0, true, 'Cabai rawit merah pedas segar super berkualitas pilihan.'),
    ('Cabai Merah Keriting',   'cabai-merah-keriting', 38000.00, 25.0, true, 'Cabai keriting merah segar pilihan pedagang pasar.'),
    ('Cabai Rawit Hijau',      'cabai-rawit-hijau',    30000.00, 20.0, true, 'Cabai rawit hijau segar cocok untuk gorengan dan sambal hijau.'),
    ('Cabai Merah Besar',      'cabai-merah-besar',    35000.00, 15.0, true, 'Cabai merah besar berdaging tebal untuk masakan pesta dan balado.'),
    ('Cabai Hijau Besar',      'cabai-hijau-besar',    25000.00, 15.0, true, 'Cabai hijau besar segar untuk tumisan dan sambal ijo padang.')
ON CONFLICT (slug) DO UPDATE SET
    current_price_per_kg = EXCLUDED.current_price_per_kg,
    stock_kg = EXCLUDED.stock_kg,
    is_available = EXCLUDED.is_available,
    updated_at = NOW();

-- Verifikasi
SELECT 'store_settings' as tabel, COUNT(*) as baris FROM store_settings
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'orders', COUNT(*) FROM orders;
