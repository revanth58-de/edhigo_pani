-- ============================================================================
-- Dinasari / Edhigo Pani — MySQL Database Schema for OTP Authentication
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `dinasari_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `dinasari_db`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `phone` VARCHAR(15) NOT NULL UNIQUE,
    `name` VARCHAR(100) NULL,
    `village` VARCHAR(100) NULL,
    `role` ENUM('farmer', 'worker', 'leader') NOT NULL DEFAULT 'farmer',
    `age` INT NULL,
    `gender` VARCHAR(20) NULL,
    `status` ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. OTP Verification Table
CREATE TABLE IF NOT EXISTS `otps` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `phone` VARCHAR(15) NOT NULL,
    `otp_hash` VARCHAR(255) NOT NULL,
    `attempts` INT UNSIGNED NOT NULL DEFAULT 0,
    `max_attempts` INT UNSIGNED NOT NULL DEFAULT 5,
    `is_verified` TINYINT(1) NOT NULL DEFAULT 0,
    `expires_at` DATETIME NOT NULL,
    `resend_available_at` DATETIME NOT NULL,
    `ip_address` VARCHAR(45) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_otps_phone_created` (`phone`, `created_at`),
    INDEX `idx_otps_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Authentication Sessions / Tokens Table
CREATE TABLE IF NOT EXISTS `user_tokens` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NOT NULL,
    `token` VARCHAR(128) NOT NULL UNIQUE,
    `expires_at` DATETIME NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_tokens_token` (`token`),
    INDEX `idx_tokens_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
