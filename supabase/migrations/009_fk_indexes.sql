-- Index sur les FK qui n'en ont pas — critique pour DELETE CASCADE performance
CREATE INDEX IF NOT EXISTS idx_reading_status_book_id ON reading_status (book_id);
CREATE INDEX IF NOT EXISTS idx_list_items_book_id ON list_items (book_id);
