-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1:3307
-- Généré le : mar. 20 jan. 2026 à 19:51
-- Version du serveur : 10.4.32-MariaDB
-- Version de PHP : 8.2.12
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */
;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */
;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */
;
/*!40101 SET NAMES utf8mb4 */
;
--
-- Base de données : `ginioux_flamary`
--

USE ginioux_flamary;
--
-- Déchargement des données de la table `users`
--

INSERT INTO `users` (
        `id`,
        `first_name`,
        `last_name`,
        `login`,
        `password_hash`,
        `role`,
        `is_active`,
        `must_change_password`,
        `created_at`,
        `updated_at`
    )
VALUES (
        1,
        'Admin',
        'App',
        'admina',
        '$2b$10$L/edm.OXiA/QYV2.sw9Z.Oj7kdhZMRx4z6E2zOQW3ZAnbHQw2c18y',
        'ADMIN',
        1,
        0,
        '2026-01-16 13:39:45',
        '2026-01-20 00:30:17'
    );
--
-- Déchargement des données de la table `products_catalog`
--

INSERT INTO `products_catalog` (
        `id`,
        `pdf_label_exact`,
        `category`,
        `weight_per_unit_kg`,
        `is_active`,
        `created_at`,
        `updated_at`
    )
VALUES (
        4,
        '(28) BIG BAG 1000KG GALETS BLANCS CALANQUE 20/40',
        'BIGBAG',
        1000.000,
        1,
        '2025-12-08 15:47:42',
        '2025-12-08 15:47:42'
    ),
    (
        5,
        '(16) BIG BAG 1000KG GRAVIER BASALTE HAWAII 30/50',
        'BIGBAG',
        1000.000,
        1,
        '2025-12-08 15:47:42',
        '2026-01-15 19:35:35'
    ),
    (
        6,
        '(58) BIG BAG 850KG GALETS POUZZOLANE NOIRE 50/80',
        'BIGBAG',
        850.000,
        1,
        '2025-12-08 15:47:42',
        '2025-12-08 15:47:42'
    ),
    (
        7,
        '(56) BIG BAG 850KG GALETS DE POUZZOLANE NOIRE 20/40',
        'BIGBAG',
        850.000,
        1,
        '2025-12-08 15:47:42',
        '2025-12-08 15:47:42'
    ),
    (
        8,
        'PIQUET DE SCHISTE 150X5/8 1 BOUT BRUT (80u/pal)',
        'ROCHE',
        22.500,
        1,
        '2025-12-08 15:47:42',
        '2025-12-08 15:47:42'
    ),
    (
        9,
        'DALLE ARDOISE 60X30X3 (90u/pal)',
        'ROCHE',
        15.300,
        1,
        '2025-12-08 15:47:42',
        '2025-12-08 15:47:42'
    ),
    (
        13,
        '(2) BIG BAG 850KG POUZZOLANE ROUGE 20/40',
        'BIGBAG',
        850.000,
        1,
        '2026-01-20 11:21:21',
        '2026-01-20 11:21:21'
    ),
    (
        14,
        '(5) BIG BAG 350KG CONCASSE ROSE TROPIQUE 6/10',
        'BIGBAG',
        350.000,
        1,
        '2026-01-20 11:21:39',
        '2026-01-20 11:21:39'
    ),
    (
        15,
        '(8) BIG BAG 1000KG CONCASSE BLANC BONIFACIO 20/40',
        'BIGBAG',
        1000.000,
        1,
        '2026-01-20 11:21:49',
        '2026-01-20 11:23:28'
    ),
    (
        16,
        '(9) BIG BAG 350KG CONCASSE JAUNE SAFARI 6/10',
        'AUTRE',
        350.000,
        1,
        '2026-01-20 11:21:59',
        '2026-01-20 11:23:36'
    );
COMMIT;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */
;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */
;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */
;