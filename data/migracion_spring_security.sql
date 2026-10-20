-- ==========================================================================
--  Migración Spring Security
-- --------------------------------------------------------------------------
--  Ejecutar SOLO si las tablas 'users' y 'authorities' ya existen creadas a
--  mano (la columna 'password_changed' es nueva y es la que permite forzar
--  el cambio de contraseña en el primer login).
-- ==========================================================================
USE `api_rest_spring-boot`;

ALTER TABLE `users`
  ADD COLUMN `password_changed` tinyint(1) NOT NULL DEFAULT '0';

-- La FK de authorities -> users debe existir; si no se creó, añadirla con:
-- ALTER TABLE `authorities`
--   ADD CONSTRAINT `authorities_user` FOREIGN KEY (`user_id`)
--   REFERENCES `users` (`user_id`);

-- Comprobaciones:
SELECT * FROM `users`;
SELECT * FROM `authorities`;
