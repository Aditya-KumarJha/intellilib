-- Decouple fine payments from physical return completion.
-- Paying a fine should not automatically mark a book as returned.
-- Return status must be handled by librarian-approved return workflow.

BEGIN;

DROP TRIGGER IF EXISTS trg_mark_transaction_returned_on_fine_payment ON public.fines;
DROP FUNCTION IF EXISTS public.mark_transaction_returned_on_fine_payment();

COMMIT;
