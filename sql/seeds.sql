
------------------------------------------------------------
-- Creates first user, password is 'secret'
------------------------------------------------------------

INSERT INTO users (uname, role, digest) VALUES 
 ('foo', 'ADMIN', '$2a$12$3InPKSvlWwgLHYVxvJpaMeXDZF/.hhoiYMv72xydoqm3Pg58Emrwm')
,('test', 'ADMIN', '$2a$12$3InPKSvlWwgLHYVxvJpaMeXDZF/.hhoiYMv72xydoqm3Pg58Emrwm')
;

------------------------------------------------------------
-- Create some users, password is always 'secret'
------------------------------------------------------------

INSERT INTO users (uname, digest)
  SELECT
    'user-' || x.id,
    '$2a$12$3InPKSvlWwgLHYVxvJpaMeXDZF/.hhoiYMv72xydoqm3Pg58Emrwm'
  FROM generate_series(1, 1000) AS x(id)
;

------------------------------------------------------------
-- Create some messages
------------------------------------------------------------

INSERT INTO messages (user_id, markup, ip_address)
  SELECT
    trunc(random() * 1000 + 1), -- Random int [1, 1000]
    'Seeded message ' || x.id,
    '1.2.3.4'::inet
  FROM generate_series(1, 1000) AS x(id)
;

INSERT INTO messages (user_id, markup, ip_address) VALUES
(null, 'This is an anonymous message!', '1.2.3.4'::inet)
;
