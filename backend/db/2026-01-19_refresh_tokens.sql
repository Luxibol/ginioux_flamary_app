CREATE TABLE refresh_tokens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    -- SHA-256 hex
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    replaced_by_hash CHAR(64) NULL,
    ip VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uniq_token_hash (token_hash),
    KEY idx_user_id (user_id),
    CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE = InnoDB;