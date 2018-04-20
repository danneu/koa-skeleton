DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

CREATE EXTENSION citext;
CREATE EXTENSION "uuid-ossp";

------------------------------------------------------------
------------------------------------------------------------

CREATE TYPE user_role AS ENUM ('ADMIN', 'MOD', 'MEMBER', 'BANNED');

CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  uname          citext      NOT NULL,
  role           user_role   NOT NULL DEFAULT 'MEMBER',
  digest         bytea       NOT NULL,
  email          citext      NULL,
  last_online_at timestamptz NOT NULL DEFAULT NOW(),
  created_at     timestamptz NOT NULL DEFAULT NOW(),

  UNIQUE (uname)
);

------------------------------------------------------------
------------------------------------------------------------

CREATE TABLE sessions (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid        NOT NULL REFERENCES users (id),
  ip_address inet        NOT NULL,
  user_agent text        NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  expired_at timestamptz NOT NULL DEFAULT NOW() + INTERVAL '2 weeks',
  revoked_at timestamptz NULL,

  CHECK (created_at < expired_at)
);

-- Speed up user_id FK joins
CREATE INDEX ON sessions (user_id);

CREATE VIEW active_sessions AS
  SELECT *
  FROM sessions
  WHERE expired_at > NOW() AND revoked_at IS NULL;

------------------------------------------------------------
------------------------------------------------------------

CREATE TABLE messages (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- if null, then user is anonymous
  user_id    uuid        NULL REFERENCES users (id),
  markup     text        NOT NULL,
  is_hidden  boolean     NOT NULL DEFAULT false,
  ip_address inet        NOT NULL,
  user_agent text        NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Speed up user_id FK joins
CREATE INDEX ON messages (user_id);

------------------------------------------------------------
------------------------------------------------------------

CREATE OR REPLACE FUNCTION ip_root(ip_address inet) RETURNS inet AS $$
  DECLARE
    masklen int;
  BEGIN
    masklen := CASE family(ip_address) WHEN 4 THEN 24 ELSE 48 END;
    RETURN host(network(set_masklen(ip_address, masklen)));
  END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE TABLE ratelimits (
  id         bigserial PRIMARY KEY,
  ip_address inet        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX ON ratelimits (ip_root(ip_address));
