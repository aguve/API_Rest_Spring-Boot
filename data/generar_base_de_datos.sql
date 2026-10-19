CREATE DATABASE IF NOT EXISTS `api_rest_spring-boot`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;
USE `api_rest_spring-boot`;

CREATE TABLE `profesor` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(45) NOT NULL,
  `apellidos` varchar(45) NOT NULL,
  `direccion` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `materia` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(45) NOT NULL,
  `creditos` int NOT NULL,
  `horas_catedra` int NOT NULL,
  `id_profesor` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `id_profesor_idx` (`id_profesor`),
  CONSTRAINT `id_profesor` FOREIGN KEY (`id_profesor`) REFERENCES `profesor` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ==========================================================================
--  Spring Security (login con sesión)
-- --------------------------------------------------------------------------
--  * users.user_id es compartido con profesor.id para ROLE_DIRECTOR y
--    ROLE_PROFESOR (el usuario es a su vez una fila de "profesor").
--  * El único usuario que NO existe en "profesor" es ROLE_ADMIN.
--  * password_changed = 0 obliga a cambiar la contraseña en el primer login.
--  * El usuario administrador (user_id = 1000) lo inserta la propia
--    aplicación al arrancar (bcrypt), por eso no hay INSERT aquí.
-- ==========================================================================
CREATE TABLE `users` (
  `user_id` int NOT NULL,
  `password` varchar(100) NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `password_changed` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `authorities` (
  `user_id` int NOT NULL,
  `authority` varchar(20) NOT NULL,
  PRIMARY KEY (`user_id`,`authority`),
  KEY `idx_authorities_user` (`user_id`),
  CONSTRAINT `authorities_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;