ALTER TABLE shipments
ADD COLUMN bureau_ack_at DATETIME NULL
AFTER received_at,
    ADD COLUMN bureau_ack_by BIGINT(20) UNSIGNED NULL
AFTER bureau_ack_at;
CREATE INDEX idx_shipments_order_ack ON shipments (order_id, bureau_ack_at);