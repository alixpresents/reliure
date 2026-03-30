-- Index pour accélérer la policy RLS sur list_items (audit #30)
CREATE INDEX IF NOT EXISTS idx_lists_public_owner ON lists (id, is_public, user_id);
