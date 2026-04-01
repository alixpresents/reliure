-- Performance indexes for reviews table
-- Fixes: reviews by user_id and book_id were doing full table scans

CREATE INDEX IF NOT EXISTS reviews_user_id_idx ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS reviews_book_id_idx ON public.reviews(book_id);
