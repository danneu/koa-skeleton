
-- Creates first user, password is 'secret'
INSERT INTO users (uname, role, digest)
VALUES ('foo', 'ADMIN', '$2a$12$3InPKSvlWwgLHYVxvJpaMeXDZF/.hhoiYMv72xydoqm3Pg58Emrwm');

-- Create some messages
INSERT INTO messages (user_id, markup, ip_address)
VALUES
 (1, 'Hello, world!', '1.2.3.4'::inet)
,(null, 'This is an anonymous message!', '1.2.3.4'::inet)
;
