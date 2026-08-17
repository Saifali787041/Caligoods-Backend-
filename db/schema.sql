-- =============================================================================
--  Caligoods Enterprise Platform — MySQL schema
-- -----------------------------------------------------------------------------
--  This is the platform's OWN data only (auth, roles, sessions, audit, and the
--  shared Zoho access-token cache). Business data (items, customers, orders,
--  invoices, payments) lives in Zoho Inventory and is NOT stored here.
--
--  This DDL is equivalent to what `npm run db:init` builds from the Sequelize
--  models. Use whichever you prefer; do not run both against the same DB.
--  Target: MySQL 8.0+.  Engine: InnoDB.  Charset: utf8mb4.
-- =============================================================================

SET NAMES utf8mb4;

-- Create and select the database so this file can be imported at the server root
-- (e.g. phpMyAdmin > Import without a DB selected). The name must match MYSQL_DATABASE in .env.
CREATE DATABASE IF NOT EXISTS `caligoods` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `caligoods`;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- roles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `roles` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        ENUM('super_admin','admin','sales_manager','warehouse_manager','customer_support','customer') NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- users  (platform staff + customer accounts; password is bcrypt-hashed)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`                            CHAR(36) NOT NULL DEFAULT (UUID()),
  `first_name`                    VARCHAR(255) NOT NULL,
  `last_name`                     VARCHAR(255) NOT NULL,
  `email`                         VARCHAR(255) NOT NULL,
  `password`                      VARCHAR(255) NOT NULL,
  `role_id`                       INT UNSIGNED NOT NULL,
  `is_active`                     TINYINT(1) NOT NULL DEFAULT 1,
  `is_email_verified`             TINYINT(1) NOT NULL DEFAULT 0,
  `email_verification_token_hash` VARCHAR(255) DEFAULT NULL,
  `email_verification_expires`    DATETIME DEFAULT NULL,
  `password_reset_token_hash`     VARCHAR(255) DEFAULT NULL,
  `password_reset_expires`        DATETIME DEFAULT NULL,
  `last_login_at`                 DATETIME DEFAULT NULL,
  `created_at`                    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `ix_users_role_id` (`role_id`),
  KEY `ix_users_email_verify_hash` (`email_verification_token_hash`),
  KEY `ix_users_password_reset_hash` (`password_reset_token_hash`),
  CONSTRAINT `fk_users_role`
    FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- refresh_tokens  (rotating; stored as SHA-256 hash, never the raw token)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id`                     CHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id`                CHAR(36) NOT NULL,
  `token_hash`             VARCHAR(255) NOT NULL,
  `expires_at`             DATETIME NOT NULL,
  `revoked_at`             DATETIME DEFAULT NULL,
  `replaced_by_token_hash` VARCHAR(255) DEFAULT NULL,
  `created_by_ip`          VARCHAR(255) DEFAULT NULL,
  `created_at`             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_refresh_token_hash` (`token_hash`),
  KEY `ix_refresh_user_id` (`user_id`),
  CONSTRAINT `fk_refresh_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- zoho_tokens  (single shared row; short-lived access token cache. The refresh
--               token & client secret are NEVER stored here — only in .env)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `zoho_tokens` (
  `id`           INT UNSIGNED NOT NULL DEFAULT 1,
  `access_token` TEXT NOT NULL,
  `api_domain`   VARCHAR(255) NOT NULL,
  `expires_at`   DATETIME NOT NULL,
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- audit_logs  (append-only; actor kept even if the user is later deleted)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id`          CHAR(36) NOT NULL DEFAULT (UUID()),
  `actor_id`    CHAR(36) DEFAULT NULL,
  `action`      VARCHAR(255) NOT NULL,
  `target_type` VARCHAR(255) DEFAULT NULL,
  `target_id`   VARCHAR(255) DEFAULT NULL,
  `meta`        JSON DEFAULT NULL,
  `ip`          VARCHAR(255) DEFAULT NULL,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_audit_actor_id` (`actor_id`),
  KEY `ix_audit_action` (`action`),
  KEY `ix_audit_created_at` (`created_at`),
  CONSTRAINT `fk_audit_actor`
    FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- seed: the six roles (idempotent)
-- ----------------------------------------------------------------------------
INSERT INTO `roles` (`name`, `description`) VALUES
  ('super_admin',       'Full system access, including configuration and user management'),
  ('admin',             'Administrative access to most modules'),
  ('sales_manager',     'Manage sales orders, customers and invoices'),
  ('warehouse_manager', 'Manage inventory, stock, packages and shipments'),
  ('customer_support',  'Read access to orders and customers for support'),
  ('customer',          'Storefront customer account')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

-- After loading this schema, create your first admin:
--   npm run create-admin -- --email=you@caligoodsinc.com --password='Str0ngPass1' --role=super_admin
