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