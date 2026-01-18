-- 1 ligne max par (order_id, user_id)
ALTER TABLE order_comment_reads
ADD UNIQUE KEY uq_order_user (order_id, user_id);
-- perf : load/compte commentaires
CREATE INDEX idx_order_comments_order_created ON order_comments (order_id, created_at);