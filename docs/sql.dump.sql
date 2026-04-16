BEGIN;

-- =============================================================
-- IntelliLib canonical SQL dump
-- Purpose:
--   1) Create complete schema for fresh environments
--   2) Include final constraints, indexes, functions, triggers, and RLS
-- Notes:
--   - Designed for Supabase Postgres (auth.users + auth.uid())
--   - This file is the clean setup counterpart to docs/sqlFile.txt history
-- =============================================================

-- -------------------------------------------------------------
-- A) Identity and profile layer
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'librarian', 'admin')),
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended'))
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- -------------------------------------------------------------
-- B) Catalog domain
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.books (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'physical' CHECK (type IN ('physical', 'digital', 'both')),
  category_id BIGINT REFERENCES public.categories(id),
  isbn TEXT UNIQUE,
  cover_url TEXT,
  pdf_url TEXT,
  publisher TEXT,
  published_year INT,
  total_copies INT NOT NULL DEFAULT 0 CHECK (total_copies >= 0),
  available_copies INT NOT NULL DEFAULT 0 CHECK (available_copies >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.book_copies (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  book_id BIGINT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('physical', 'digital')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'issued', 'reserved', 'lost', 'maintenance')),
  location TEXT,
  access_url TEXT,
  condition TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT check_location_access CHECK (
    (type = 'physical' AND location IS NOT NULL)
    OR
    (type = 'digital' AND access_url IS NOT NULL)
  )
);

-- -------------------------------------------------------------
-- C) Circulation domain
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  book_copy_id BIGINT NOT NULL REFERENCES public.book_copies(id),
  issue_date TIMESTAMP NOT NULL DEFAULT NOW(),
  due_date TIMESTAMP NOT NULL,
  return_date TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'returned', 'overdue')),
  fine_amount INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT check_due_date CHECK (due_date >= issue_date),
  CONSTRAINT check_dates CHECK (return_date IS NULL OR return_date >= issue_date),
  CONSTRAINT check_transactions_fine_non_negative CHECK (fine_amount >= 0)
);

CREATE TABLE IF NOT EXISTS public.reservations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  book_id BIGINT NOT NULL REFERENCES public.books(id),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'approved', 'cancelled', 'completed')),
  queue_position INT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.return_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transaction_id BIGINT NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP,
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- D) Finance domain
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fines (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  transaction_id BIGINT NOT NULL REFERENCES public.transactions(id),
  amount INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT check_fines_amount_positive CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS public.payments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  fine_id BIGINT NOT NULL REFERENCES public.fines(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'razorpay',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'success', 'failed')),
  method TEXT,
  bank TEXT,
  wallet TEXT,
  vpa TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT check_payments_amount_positive CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  max_books_per_user INT NOT NULL DEFAULT 3,
  max_days_allowed INT NOT NULL DEFAULT 14,
  fine_per_day INT NOT NULL DEFAULT 5,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO public.system_settings (max_books_per_user, max_days_allowed, fine_per_day)
SELECT 3, 14, 5
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings);

-- -------------------------------------------------------------
-- E) Communication + observability domain
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT CHECK (type IN ('due_reminder', 'fine_alert', 'payment_success', 'reservation_update')),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  target_role TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id BIGINT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_queries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID,
  query TEXT NOT NULL,
  response TEXT,
  context JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id BIGINT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- F) Indexes and uniqueness
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_book_copies_book_id ON public.book_copies(book_id);
CREATE INDEX IF NOT EXISTS idx_book_copies_status ON public.book_copies(status);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_copy ON public.transactions(book_copy_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_status_open ON public.transactions(user_id, status, return_date);
CREATE INDEX IF NOT EXISTS idx_transactions_due_open ON public.transactions(due_date) WHERE return_date IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_issue ON public.transactions(book_copy_id) WHERE return_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_book ON public.reservations(book_id);
CREATE INDEX IF NOT EXISTS idx_reservations_user ON public.reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_user_book_status ON public.reservations(user_id, book_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS unique_queue_position_active
  ON public.reservations(book_id, queue_position)
  WHERE queue_position IS NOT NULL AND status IN ('waiting', 'approved');
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_reservation_per_user_book
  ON public.reservations(user_id, book_id)
  WHERE status IN ('waiting', 'approved');

CREATE INDEX IF NOT EXISTS idx_return_requests_user_status
  ON public.return_requests(user_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_return_requests_transaction_status
  ON public.return_requests(transaction_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_return_request_pending_per_tx
  ON public.return_requests(transaction_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_fines_transaction ON public.fines(transaction_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_fine_per_transaction ON public.fines(transaction_id);

CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_fine ON public.payments(fine_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_payments_razorpay_payment_id
  ON public.payments(razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON public.notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_user ON public.ai_queries(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_user_book_unique ON public.bookmarks(user_id, book_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_created ON public.bookmarks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_book ON public.bookmarks(book_id);

-- -------------------------------------------------------------
-- G) Business rule functions and triggers
-- -------------------------------------------------------------

-- Keep aggregate counts on books in sync with book_copies changes.
CREATE OR REPLACE FUNCTION public.update_book_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.books
  SET total_copies = (
    SELECT COUNT(*)
    FROM public.book_copies
    WHERE book_id = COALESCE(NEW.book_id, OLD.book_id)
  )
  WHERE id = COALESCE(NEW.book_id, OLD.book_id);

  UPDATE public.books
  SET available_copies = (
    SELECT COUNT(*)
    FROM public.book_copies
    WHERE book_id = COALESCE(NEW.book_id, OLD.book_id)
      AND status = 'available'
  )
  WHERE id = COALESCE(NEW.book_id, OLD.book_id);

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_book_copy_insert ON public.book_copies;
CREATE TRIGGER trg_book_copy_insert
AFTER INSERT ON public.book_copies
FOR EACH ROW
EXECUTE FUNCTION public.update_book_counts();

DROP TRIGGER IF EXISTS trg_book_copy_update ON public.book_copies;
CREATE TRIGGER trg_book_copy_update
AFTER UPDATE ON public.book_copies
FOR EACH ROW
EXECUTE FUNCTION public.update_book_counts();

DROP TRIGGER IF EXISTS trg_book_copy_delete ON public.book_copies;
CREATE TRIGGER trg_book_copy_delete
AFTER DELETE ON public.book_copies
FOR EACH ROW
EXECUTE FUNCTION public.update_book_counts();

-- Derive transaction status from due_date/return_date.
CREATE OR REPLACE FUNCTION public.normalize_transaction_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.return_date IS NOT NULL THEN
    NEW.status := 'returned';
  ELSIF NEW.due_date < NOW() THEN
    NEW.status := 'overdue';
  ELSE
    NEW.status := 'issued';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_transaction_status ON public.transactions;
CREATE TRIGGER trg_normalize_transaction_status
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.normalize_transaction_status();

-- Enforce issuance rules:
--   1) no new issue if user has an open overdue
--   2) no duplicate active copy of same book for same user
CREATE OR REPLACE FUNCTION public.validate_transaction_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_book_id BIGINT;
BEGIN
  SELECT bc.book_id
  INTO v_book_id
  FROM public.book_copies bc
  WHERE bc.id = NEW.book_copy_id;

  IF v_book_id IS NULL THEN
    RAISE EXCEPTION 'Invalid book_copy_id: %', NEW.book_copy_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.transactions t
    WHERE t.user_id = NEW.user_id
      AND t.return_date IS NULL
      AND (t.status = 'overdue' OR t.due_date < NOW())
      AND (TG_OP = 'INSERT' OR t.id <> NEW.id)
  ) THEN
    RAISE EXCEPTION 'User % has overdue books and cannot issue new books.', NEW.user_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.transactions t
    JOIN public.book_copies bc2 ON bc2.id = t.book_copy_id
    WHERE t.user_id = NEW.user_id
      AND t.return_date IS NULL
      AND bc2.book_id = v_book_id
      AND (TG_OP = 'INSERT' OR t.id <> NEW.id)
  ) THEN
    RAISE EXCEPTION 'User % already has an active copy of book %.', NEW.user_id, v_book_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_transaction_rules ON public.transactions;
CREATE TRIGGER trg_validate_transaction_rules
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW
WHEN (NEW.return_date IS NULL)
EXECUTE FUNCTION public.validate_transaction_rules();

-- Keep copy status synchronized with active transactions.
CREATE OR REPLACE FUNCTION public.refresh_book_copy_status(p_copy_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.book_copies bc
  SET status = CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.transactions t
      WHERE t.book_copy_id = p_copy_id
        AND t.return_date IS NULL
    ) THEN 'issued'
    ELSE 'available'
  END
  WHERE bc.id = p_copy_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_book_copy_status_from_transactions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.refresh_book_copy_status(NEW.book_copy_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.book_copy_id IS DISTINCT FROM OLD.book_copy_id THEN
      PERFORM public.refresh_book_copy_status(OLD.book_copy_id);
      PERFORM public.refresh_book_copy_status(NEW.book_copy_id);
    ELSE
      PERFORM public.refresh_book_copy_status(NEW.book_copy_id);
    END IF;
    RETURN NEW;
  ELSE
    PERFORM public.refresh_book_copy_status(OLD.book_copy_id);
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_book_copy_status_from_transactions ON public.transactions;
CREATE TRIGGER trg_sync_book_copy_status_from_transactions
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_book_copy_status_from_transactions();

-- Block reservation if user already holds an active issued copy of same book.
CREATE OR REPLACE FUNCTION public.validate_reservation_no_active_issue()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.transactions t
    JOIN public.book_copies bc ON bc.id = t.book_copy_id
    WHERE t.user_id = NEW.user_id
      AND t.return_date IS NULL
      AND bc.book_id = NEW.book_id
  ) THEN
    RAISE EXCEPTION 'User % already has an active copy of book %; cannot reserve.', NEW.user_id, NEW.book_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_reservation_no_active_issue ON public.reservations;
CREATE TRIGGER trg_validate_reservation_no_active_issue
BEFORE INSERT ON public.reservations
FOR EACH ROW
WHEN (NEW.status IN ('waiting', 'approved'))
EXECUTE FUNCTION public.validate_reservation_no_active_issue();

-- Promote waiting reservations up to current capacity.
CREATE OR REPLACE FUNCTION public.promote_waiting_reservations(
  p_book_id BIGINT,
  p_limit INT DEFAULT NULL
)
RETURNS TABLE (
  reservation_id BIGINT,
  user_id UUID,
  queue_position INT,
  approved_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_available_count INT := 0;
  v_approved_count INT := 0;
  v_slots INT := 0;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  PERFORM pg_advisory_xact_lock(p_book_id);

  SELECT COUNT(*)
  INTO v_available_count
  FROM public.book_copies
  WHERE book_id = p_book_id
    AND type = 'physical'
    AND status = 'available';

  SELECT COUNT(*)
  INTO v_approved_count
  FROM public.reservations
  WHERE book_id = p_book_id
    AND status = 'approved';

  v_slots := GREATEST(0, v_available_count - v_approved_count);

  IF p_limit IS NOT NULL AND p_limit > 0 THEN
    v_slots := LEAST(v_slots, p_limit);
  END IF;

  IF v_slots <= 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT r.id, r.user_id, r.queue_position
    FROM public.reservations r
    WHERE r.book_id = p_book_id
      AND r.status = 'waiting'
    ORDER BY r.queue_position ASC, r.created_at ASC
    LIMIT v_slots
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.reservations r
  SET status = 'approved',
      created_at = v_now
  FROM candidates c
  WHERE r.id = c.id
  RETURNING r.id, r.user_id, r.queue_position, v_now;
END;
$$;

-- Auto-close transaction when fine gets paid.
CREATE OR REPLACE FUNCTION public.mark_transaction_returned_on_fine_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.paid_at IS NOT NULL AND (OLD.paid_at IS DISTINCT FROM NEW.paid_at) THEN
    UPDATE public.transactions
    SET return_date = COALESCE(return_date, NEW.paid_at),
        status = 'returned'
    WHERE id = NEW.transaction_id
      AND return_date IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_transaction_returned_on_fine_payment ON public.fines;
CREATE TRIGGER trg_mark_transaction_returned_on_fine_payment
AFTER UPDATE OF paid_at ON public.fines
FOR EACH ROW
WHEN (NEW.paid_at IS NOT NULL)
EXECUTE FUNCTION public.mark_transaction_returned_on_fine_payment();

-- -------------------------------------------------------------
-- H) Role helpers + RLS policies
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_user_role() IN ('admin', 'librarian'), FALSE)
$$;

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- books
DROP POLICY IF EXISTS books_read ON public.books;
CREATE POLICY books_read ON public.books
FOR SELECT TO authenticated
USING (TRUE);

DROP POLICY IF EXISTS books_write_staff ON public.books;
CREATE POLICY books_write_staff ON public.books
FOR ALL TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

-- book_copies
DROP POLICY IF EXISTS book_copies_read ON public.book_copies;
CREATE POLICY book_copies_read ON public.book_copies
FOR SELECT TO authenticated
USING (TRUE);

DROP POLICY IF EXISTS book_copies_write_staff ON public.book_copies;
CREATE POLICY book_copies_write_staff ON public.book_copies
FOR ALL TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

-- categories
DROP POLICY IF EXISTS categories_read ON public.categories;
CREATE POLICY categories_read ON public.categories
FOR SELECT TO authenticated
USING (TRUE);

DROP POLICY IF EXISTS categories_write_staff ON public.categories;
CREATE POLICY categories_write_staff ON public.categories
FOR ALL TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

-- system_settings
DROP POLICY IF EXISTS system_settings_read ON public.system_settings;
CREATE POLICY system_settings_read ON public.system_settings
FOR SELECT TO authenticated
USING (TRUE);

DROP POLICY IF EXISTS system_settings_write_admin ON public.system_settings;
CREATE POLICY system_settings_write_admin ON public.system_settings
FOR ALL TO authenticated
USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin');

-- transactions
DROP POLICY IF EXISTS transactions_select_own_or_staff ON public.transactions;
CREATE POLICY transactions_select_own_or_staff ON public.transactions
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS transactions_insert_own_or_staff ON public.transactions;
CREATE POLICY transactions_insert_own_or_staff ON public.transactions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS transactions_update_own_or_staff ON public.transactions;
CREATE POLICY transactions_update_own_or_staff ON public.transactions
FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.is_staff())
WITH CHECK (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS transactions_delete_staff_only ON public.transactions;
CREATE POLICY transactions_delete_staff_only ON public.transactions
FOR DELETE TO authenticated
USING (public.is_staff());

-- fines
DROP POLICY IF EXISTS fines_select_own_or_staff ON public.fines;
CREATE POLICY fines_select_own_or_staff ON public.fines
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS fines_write_staff ON public.fines;
CREATE POLICY fines_write_staff ON public.fines
FOR ALL TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

-- payments
DROP POLICY IF EXISTS payments_select_own_or_staff ON public.payments;
CREATE POLICY payments_select_own_or_staff ON public.payments
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS payments_insert_own_or_staff ON public.payments;
CREATE POLICY payments_insert_own_or_staff ON public.payments
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS payments_update_staff ON public.payments;
CREATE POLICY payments_update_staff ON public.payments
FOR UPDATE TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

-- notifications
DROP POLICY IF EXISTS notifications_select_own_or_staff ON public.notifications;
CREATE POLICY notifications_select_own_or_staff ON public.notifications
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS notifications_insert_staff ON public.notifications;
CREATE POLICY notifications_insert_staff ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS notifications_update_own_or_staff ON public.notifications;
CREATE POLICY notifications_update_own_or_staff ON public.notifications
FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.is_staff())
WITH CHECK (auth.uid() = user_id OR public.is_staff());

-- reservations
DROP POLICY IF EXISTS reservations_select_own_or_staff ON public.reservations;
CREATE POLICY reservations_select_own_or_staff ON public.reservations
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS reservations_insert_own_or_staff ON public.reservations;
CREATE POLICY reservations_insert_own_or_staff ON public.reservations
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS reservations_update_own_or_staff ON public.reservations;
CREATE POLICY reservations_update_own_or_staff ON public.reservations
FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.is_staff())
WITH CHECK (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS reservations_delete_staff ON public.reservations;
CREATE POLICY reservations_delete_staff ON public.reservations
FOR DELETE TO authenticated
USING (public.is_staff());

-- ai_queries
DROP POLICY IF EXISTS ai_queries_select_own_or_staff ON public.ai_queries;
CREATE POLICY ai_queries_select_own_or_staff ON public.ai_queries
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS ai_queries_insert_own_or_staff ON public.ai_queries;
CREATE POLICY ai_queries_insert_own_or_staff ON public.ai_queries
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_staff());

-- audit_logs
DROP POLICY IF EXISTS audit_logs_select_staff ON public.audit_logs;
CREATE POLICY audit_logs_select_staff ON public.audit_logs
FOR SELECT TO authenticated
USING (public.is_staff());

DROP POLICY IF EXISTS audit_logs_insert_own_or_staff ON public.audit_logs;
CREATE POLICY audit_logs_insert_own_or_staff ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (
  public.is_staff()
  OR (user_id IS NOT NULL AND user_id = auth.uid())
);

-- return_requests
DROP POLICY IF EXISTS return_requests_select_own_or_staff ON public.return_requests;
CREATE POLICY return_requests_select_own_or_staff ON public.return_requests
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS return_requests_insert_own ON public.return_requests;
CREATE POLICY return_requests_insert_own ON public.return_requests
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS return_requests_update_staff ON public.return_requests;
CREATE POLICY return_requests_update_staff ON public.return_requests
FOR UPDATE TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS return_requests_delete_staff ON public.return_requests;
CREATE POLICY return_requests_delete_staff ON public.return_requests
FOR DELETE TO authenticated
USING (public.is_staff());

-- bookmarks
DROP POLICY IF EXISTS bookmarks_select_own_or_staff ON public.bookmarks;
CREATE POLICY bookmarks_select_own_or_staff ON public.bookmarks
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS bookmarks_insert_own_or_staff ON public.bookmarks;
CREATE POLICY bookmarks_insert_own_or_staff ON public.bookmarks
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS bookmarks_delete_own_or_staff ON public.bookmarks;
CREATE POLICY bookmarks_delete_own_or_staff ON public.bookmarks
FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.is_staff());

-- -------------------------------------------------------------
-- I) Realtime publication registration (Supabase)
-- -------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'return_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.return_requests;
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'bookmarks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookmarks;
  END IF;
END;
$$;

COMMIT;
