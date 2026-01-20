-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1:3307
-- Généré le : mar. 20 jan. 2026 à 19:49
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

CREATE DATABASE IF NOT EXISTS `ginioux_flamary` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `ginioux_flamary`;

-- Création d'un utilisateur local pour la base
CREATE USER IF NOT EXISTS 'ginioux_flamary'@'localhost' IDENTIFIED BY 'MotDePasseSecurise';

-- Attribution des privilèges sur la base `ginioux_flamary`
GRANT ALL PRIVILEGES ON `ginioux_flamary`.* TO 'ginioux_flamary'@'localhost' WITH GRANT OPTION;

-- Appliquer les modifications de privilèges
FLUSH PRIVILEGES;

-- --------------------------------------------------------
--
-- Structure de la table `orders`
--

CREATE TABLE `orders` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `arc` varchar(50) NOT NULL,
  `client_name` varchar(190) NOT NULL,
  `order_date` date NOT NULL,
  `pickup_date` date DEFAULT NULL,
  `priority` enum('URGENT', 'INTERMEDIAIRE', 'NORMAL') NOT NULL DEFAULT 'NORMAL',
  `production_status` enum('A_PROD', 'PROD_PARTIELLE', 'PROD_COMPLETE') NOT NULL DEFAULT 'A_PROD',
  `production_validated_at` datetime DEFAULT NULL,
  `expedition_status` enum('NON_EXPEDIEE', 'EXP_PARTIELLE', 'EXP_COMPLETE') NOT NULL DEFAULT 'NON_EXPEDIEE',
  `is_archived` tinyint(1) NOT NULL DEFAULT 0,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- --------------------------------------------------------
--
-- Structure de la table `order_comments`
--

CREATE TABLE `order_comments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `author_id` bigint(20) UNSIGNED NOT NULL,
  `content` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- --------------------------------------------------------
--
-- Structure de la table `order_comment_reads`
--

CREATE TABLE `order_comment_reads` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `last_read_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- --------------------------------------------------------
--
-- Structure de la table `order_products`
--

CREATE TABLE `order_products` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `product_label_pdf` varchar(255) NOT NULL,
  `quantity_ordered` decimal(12, 3) NOT NULL,
  `quantity_ready` decimal(12, 3) NOT NULL DEFAULT 0.000,
  `quantity_shipped` decimal(12, 3) NOT NULL DEFAULT 0.000,
  `quantity_loaded` decimal(12, 3) NOT NULL DEFAULT 0.000,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- --------------------------------------------------------
--
-- Structure de la table `products_catalog`
--

CREATE TABLE `products_catalog` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `pdf_label_exact` varchar(255) NOT NULL,
  `category` enum('BIGBAG', 'ROCHE', 'AUTRE') NOT NULL DEFAULT 'AUTRE',
  `weight_per_unit_kg` decimal(10, 3) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- --------------------------------------------------------
--
-- Structure de la table `refresh_tokens`
--

CREATE TABLE `refresh_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `replaced_by_hash` char(64) DEFAULT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- --------------------------------------------------------
--
-- Structure de la table `shipments`
--

CREATE TABLE `shipments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `order_id` bigint(20) UNSIGNED NOT NULL,
  `status` enum('IN_TRANSIT', 'RECEIVED') NOT NULL DEFAULT 'IN_TRANSIT',
  `departed_at` datetime NOT NULL DEFAULT current_timestamp(),
  `received_at` datetime DEFAULT NULL,
  `bureau_ack_at` datetime DEFAULT NULL,
  `bureau_ack_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- --------------------------------------------------------
--
-- Structure de la table `shipment_lines`
--

CREATE TABLE `shipment_lines` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `shipment_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `product_label_pdf` varchar(255) NOT NULL,
  `quantity_loaded` decimal(12, 3) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- --------------------------------------------------------
--
-- Structure de la table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `login` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('ADMIN', 'BUREAU', 'PRODUCTION') NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `must_change_password` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
--
-- Index pour les tables déchargées
--

--
-- Index pour la table `orders`
--
ALTER TABLE `orders`
ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_orders_arc` (`arc`),
  ADD KEY `ix_orders_priority` (`priority`),
  ADD KEY `ix_orders_prod_status` (`production_status`),
  ADD KEY `ix_orders_exped_status` (`expedition_status`),
  ADD KEY `fk_orders_created_by` (`created_by`);
--
-- Index pour la table `order_comments`
--
ALTER TABLE `order_comments`
ADD PRIMARY KEY (`id`),
  ADD KEY `ix_order_comments_order` (`order_id`),
  ADD KEY `ix_order_comments_author` (`author_id`),
  ADD KEY `idx_order_comments_order_created` (`order_id`, `created_at`);
--
-- Index pour la table `order_comment_reads`
--
ALTER TABLE `order_comment_reads`
ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_comment_reads` (`order_id`, `user_id`),
  ADD KEY `fk_comment_reads_user` (`user_id`);
--
-- Index pour la table `order_products`
--
ALTER TABLE `order_products`
ADD PRIMARY KEY (`id`),
  ADD KEY `ix_order_products_order` (`order_id`),
  ADD KEY `ix_order_products_product` (`product_id`),
  ADD KEY `ix_order_products_order_loaded` (`order_id`, `quantity_loaded`);
--
-- Index pour la table `products_catalog`
--
ALTER TABLE `products_catalog`
ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_products_pdf_label` (`pdf_label_exact`);
--
-- Index pour la table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_token_hash` (`token_hash`),
  ADD KEY `idx_user_id` (`user_id`);
--
-- Index pour la table `shipments`
--
ALTER TABLE `shipments`
ADD PRIMARY KEY (`id`),
  ADD KEY `ix_shipments_order` (`order_id`),
  ADD KEY `ix_shipments_status` (`status`),
  ADD KEY `fk_shipments_created_by` (`created_by`),
  ADD KEY `idx_shipments_order_ack` (`order_id`, `bureau_ack_at`);
--
-- Index pour la table `shipment_lines`
--
ALTER TABLE `shipment_lines`
ADD PRIMARY KEY (`id`),
  ADD KEY `ix_shipment_lines_ship` (`shipment_id`),
  ADD KEY `fk_shipment_lines_product` (`product_id`);
--
-- Index pour la table `users`
--
ALTER TABLE `users`
ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_users_login` (`login`);
--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `orders`
--
ALTER TABLE `orders`
MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT pour la table `order_comments`
--
ALTER TABLE `order_comments`
MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT pour la table `order_comment_reads`
--
ALTER TABLE `order_comment_reads`
MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT pour la table `order_products`
--
ALTER TABLE `order_products`
MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT pour la table `products_catalog`
--
ALTER TABLE `products_catalog`
MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT pour la table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT pour la table `shipments`
--
ALTER TABLE `shipments`
MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT pour la table `shipment_lines`
--
ALTER TABLE `shipment_lines`
MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT pour la table `users`
--
ALTER TABLE `users`
MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  AUTO_INCREMENT = 8;
--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `orders`
--
ALTER TABLE `orders`
ADD CONSTRAINT `fk_orders_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE
SET NULL;
--
-- Contraintes pour la table `order_comments`
--
ALTER TABLE `order_comments`
ADD CONSTRAINT `fk_order_comments_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_order_comments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE;
--
-- Contraintes pour la table `order_comment_reads`
--
ALTER TABLE `order_comment_reads`
ADD CONSTRAINT `fk_comment_reads_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_comment_reads_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
--
-- Contraintes pour la table `order_products`
--
ALTER TABLE `order_products`
ADD CONSTRAINT `fk_order_products_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_order_products_product` FOREIGN KEY (`product_id`) REFERENCES `products_catalog` (`id`);
--
-- Contraintes pour la table `refresh_tokens`
--
ALTER TABLE `refresh_tokens`
ADD CONSTRAINT `fk_refresh_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
--
-- Contraintes pour la table `shipments`
--
ALTER TABLE `shipments`
ADD CONSTRAINT `fk_shipments_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE
SET NULL,
  ADD CONSTRAINT `fk_shipments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE;
--
-- Contraintes pour la table `shipment_lines`
--
ALTER TABLE `shipment_lines`
ADD CONSTRAINT `fk_shipment_lines_product` FOREIGN KEY (`product_id`) REFERENCES `products_catalog` (`id`),
  ADD CONSTRAINT `fk_shipment_lines_ship` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`id`) ON DELETE CASCADE;
COMMIT;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */
;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */
;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */
;