BEGIN;
CREATE SCHEMA IF NOT EXISTS plastimad;
REVOKE ALL ON SCHEMA plastimad FROM PUBLIC;
CREATE TABLE IF NOT EXISTS plastimad.users (
 id uuid PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
 password_hash text NOT NULL, role text NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','administrator')),
 phone text NOT NULL DEFAULT '', company text NOT NULL DEFAULT '', active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS plastimad.sessions (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES plastimad.users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS session_user_idx ON plastimad.sessions(user_id);
CREATE TABLE IF NOT EXISTS plastimad.reset_tokens (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES plastimad.users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS plastimad.rate_limits (
 key text PRIMARY KEY, attempts integer NOT NULL, reset_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS plastimad.products (
 id uuid PRIMARY KEY, name text NOT NULL, description text NOT NULL, category text NOT NULL,
 price_cents integer NOT NULL CHECK(price_cents>=0), unit text NOT NULL DEFAULT 'unidad',
 colors jsonb NOT NULL DEFAULT '["Nogal","Carbón","Arena"]', sizes jsonb NOT NULL DEFAULT '["S","M","L"]',
 model_url text NOT NULL DEFAULT '/models/maceta.glb', image_url text NOT NULL DEFAULT '',
 active boolean NOT NULL DEFAULT true, demo boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS plastimad.analyses (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES plastimad.users(id), image bytea NOT NULL,
 context text NOT NULL, result jsonb NOT NULL, total_cents integer NOT NULL CHECK(total_cents>=0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS plastimad.requests (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES plastimad.users(id),
 product_id uuid REFERENCES plastimad.products(id), analysis_id uuid REFERENCES plastimad.analyses(id),
 title text NOT NULL, description text NOT NULL, quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 10000),
 color text NOT NULL DEFAULT '', size text NOT NULL DEFAULT '', finish text NOT NULL DEFAULT '',
 unit_price_cents integer NOT NULL DEFAULT 0, estimated_total_cents integer NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewing','quoted','closed','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS request_owner_idx ON plastimad.requests(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS plastimad.request_events (
 id uuid PRIMARY KEY, request_id uuid NOT NULL REFERENCES plastimad.requests(id) ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES plastimad.users(id), message text NOT NULL, status text,
 internal boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS plastimad.feedback (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES plastimad.users(id),
 kind text NOT NULL CHECK(kind IN ('complaint','suggestion')), subject text NOT NULL, message text NOT NULL,
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved')),
 response text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS plastimad.chat_messages (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES plastimad.users(id),
 role text NOT NULL CHECK(role IN ('user','assistant')), content text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_owner_idx ON plastimad.chat_messages(user_id,created_at);
CREATE TABLE IF NOT EXISTS plastimad.audit (
 id uuid PRIMARY KEY, actor_id uuid REFERENCES plastimad.users(id), action text NOT NULL,
 target_id uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_login_idx ON plastimad.audit(actor_id,created_at DESC) WHERE action='auth.login';
-- This schema is deliberately private: the browser never queries Supabase directly.
-- Additive changes: existing commercial records and accounts are preserved.
ALTER TABLE plastimad.products ADD COLUMN IF NOT EXISTS length_cm double precision CHECK(length_cm > 0 AND length_cm <= 1000);
ALTER TABLE plastimad.products ADD COLUMN IF NOT EXISTS width_cm double precision CHECK(width_cm > 0 AND width_cm <= 1000);
ALTER TABLE plastimad.products ADD COLUMN IF NOT EXISTS height_cm double precision CHECK(height_cm > 0 AND height_cm <= 1000);
ALTER TABLE plastimad.products ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS single_featured_product ON plastimad.products(featured) WHERE featured=true;
ALTER TABLE plastimad.requests ADD COLUMN IF NOT EXISTS product_snapshot jsonb;
ALTER TABLE plastimad.requests DROP CONSTRAINT IF EXISTS requests_status_check;
ALTER TABLE plastimad.requests ADD CONSTRAINT requests_status_check CHECK(status IN ('new','reviewing','quoted','confirmed','preparing','shipped','delivered','closed','cancelled'));
ALTER TABLE plastimad.requests ADD COLUMN IF NOT EXISTS delivery jsonb;
ALTER TABLE plastimad.requests ADD COLUMN IF NOT EXISTS payment_method text CHECK(payment_method IS NULL OR payment_method='cod');
ALTER TABLE plastimad.requests ADD COLUMN IF NOT EXISTS checkout_key uuid;
ALTER TABLE plastimad.requests ADD COLUMN IF NOT EXISTS items jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS checkout_once_idx ON plastimad.requests(user_id,checkout_key) WHERE checkout_key IS NOT NULL;
ALTER TABLE plastimad.request_events ADD COLUMN IF NOT EXISTS system boolean NOT NULL DEFAULT false;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON SCHEMA plastimad FROM anon; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON SCHEMA plastimad FROM authenticated; END IF;
END $$;
CREATE TABLE IF NOT EXISTS plastimad.personalization_jobs (
 id uuid PRIMARY KEY, owner_hash text NOT NULL,
 phase text NOT NULL CHECK(phase IN ('selecting','generating','ready','error')),
 source_image bytea, result_image bytea, preference jsonb NOT NULL,
 excluded jsonb NOT NULL DEFAULT '[]', selection jsonb, reason text,
 event_id text, error_message text, lease_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS personalization_one_active ON plastimad.personalization_jobs(owner_hash)
 WHERE phase IN ('selecting','generating');
CREATE INDEX IF NOT EXISTS personalization_expiry ON plastimad.personalization_jobs(expires_at);
COMMIT;
