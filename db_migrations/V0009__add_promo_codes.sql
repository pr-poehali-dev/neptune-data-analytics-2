CREATE TABLE t_p12224128_neptune_data_analyti.promo_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
    max_uses INTEGER DEFAULT NULL,
    used_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE t_p12224128_neptune_data_analyti.orders
    ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS discount_percent INTEGER DEFAULT 0;
