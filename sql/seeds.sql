create or replace function rand_bool() returns boolean as 'select round(random()) = 1' language sql;
-- Returns [lo, hi-1]
create or replace function rand_int(hi int) returns int as 'select floor(random() * hi) :: int' language sql;
create or replace function rand_int(lo int, hi int) returns int as 'select (floor(random() * (hi - lo)) + lo) :: int' language sql;

create or replace function rand_inet() returns inet as $$select (rand_int(256) || '.' || rand_int(256) || '.' || rand_int(256) || '.' || rand_int(256)) :: inet$$ language sql;
create or replace function rand_user_id() returns uuid as 'select id from users where random() < 0.01 limit 1' language sql;

-- Matches the password "secret"
create or replace function seeded_digest() returns bytea as $$select decode('c2NyeXB0AA4AAAAIAAAAAUS3XIJO3T/LokiFm6Lu9trKG4jws01rHAbNT+6PucM8j6gC/uXFzJy0cJpQRFO+PSm0H6eVEa/gxbyZDwLSMEA2OSu/RibO4w9WEjSR2xJk', 'base64')$$ language sql;

------------------------------------------------------------
-- Creates admins, password is 'secret'
------------------------------------------------------------

INSERT INTO users (uname, role, digest) VALUES
  ('foo', 'ADMIN', seeded_digest()),
  ('test', 'ADMIN', seeded_digest())
;

------------------------------------------------------------
-- Bulk seed users, password is always 'secret'
------------------------------------------------------------

INSERT INTO users (uname, digest)
  SELECT
    'user-' || x.id,
    seeded_digest()
  FROM generate_series(1, 10000) AS x(id);

------------------------------------------------------------
-- Bulk seed messages, flip a coin to see if it's anonymous
------------------------------------------------------------

insert into messages (user_id, markup, ip_address)
  select
    user_id,
    case when user_id is null then
        'This is an anonymous message ' || num
    else
      'Message ' || num || ' from ' || (select u.uname from users u where u.id = user_id) end markup,
    rand_inet() ip_address
  from (
         select generate_series(1, 10000) num,
         case when rand_bool() then null
         else rand_user_id() end user_id
  ) tmp
;

------------------------------------------------------------
-- Bulk seed sessions
------------------------------------------------------------

insert into sessions (user_id, ip_address, expired_at)
  select
    rand_user_id() user_id,
    rand_inet() ip_address,
    now() + '1 year'::interval expired_at
  from generate_series(1, 10000);
