-- Register rules that live in the database. Run on a scratch database; it rolls back.
BEGIN;

INSERT INTO auth.users (id, email) VALUES ('44444444-4444-4444-4444-444444444444', 'owner-r@test.id');
CREATE OR REPLACE FUNCTION pg_temp.act_as(p_uid text, p_email text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', coalesce(p_uid, ''), true);
  PERFORM set_config('request.jwt.claims',
    CASE WHEN p_uid IS NULL THEN '' ELSE json_build_object('sub', p_uid, 'email', p_email, 'role', 'authenticated')::text END, true);
END $$;

SELECT pg_temp.act_as('44444444-4444-4444-4444-444444444444', 'owner-r@test.id');
SET LOCAL ROLE authenticated;
SELECT id FROM public.create_merchant('m_r', 'Warung R', 'fnb', 'Rina');

INSERT INTO register_sessions (id, merchant_id, opened_at, opened_by_name, opening_float)
VALUES ('s1', 'm_r', now(), 'Rina', 200000);

DO $$ BEGIN
  BEGIN
    INSERT INTO register_sessions (id, merchant_id, opened_at, opened_by_name, opening_float)
    VALUES ('s2', 'm_r', now(), 'Budi', 100000);
    RAISE EXCEPTION 'two shifts open at once';
  EXCEPTION WHEN unique_violation THEN NULL; END;

  BEGIN
    INSERT INTO cash_movements (id, merchant_id, session_id, type, amount, reason, by_name)
    VALUES ('m1', 'm_r', 's1', 'out', 0, 'zero', 'Rina');
    RAISE EXCEPTION 'zero-amount cash movement accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  BEGIN
    INSERT INTO cash_movements (id, merchant_id, session_id, type, amount, reason, by_name)
    VALUES ('m2', 'm_r', 'ghost', 'out', 5000, 'no such shift', 'Rina');
    RAISE EXCEPTION 'cash movement attached to a missing shift';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
END $$;

INSERT INTO cash_movements (id, merchant_id, session_id, type, amount, reason, by_name)
VALUES ('m3', 'm_r', 's1', 'out', 25000, 'Ice supplier', 'Rina');

-- Closing frees the slot for the next shift
UPDATE register_sessions SET status = 'closed', closed_at = now(), counted_cash = 175000, expected_cash = 175000, variance = 0
WHERE merchant_id = 'm_r' AND id = 's1';
INSERT INTO register_sessions (id, merchant_id, opened_at, opened_by_name, opening_float)
VALUES ('s2', 'm_r', now(), 'Budi', 100000);
RESET ROLE;

-- Another merchant sees nothing of this
INSERT INTO auth.users (id, email) VALUES ('55555555-5555-5555-5555-555555555555', 'other@test.id');
SELECT pg_temp.act_as('55555555-5555-5555-5555-555555555555', 'other@test.id');
SET LOCAL ROLE authenticated;
SELECT id FROM public.create_merchant('m_other', 'Other', 'retail', 'Other');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM register_sessions WHERE merchant_id = 'm_r') THEN RAISE EXCEPTION 'shifts leak across merchants'; END IF;
  IF EXISTS (SELECT 1 FROM cash_movements WHERE merchant_id = 'm_r') THEN RAISE EXCEPTION 'cash movements leak across merchants'; END IF;
  -- Its own open shift is still allowed: the one-open rule is per merchant
  INSERT INTO register_sessions (id, merchant_id, opened_at, opened_by_name, opening_float)
  VALUES ('s1', 'm_other', now(), 'Other', 50000);
END $$;
RESET ROLE;

SELECT 'ALL REGISTER CHECKS PASSED' AS result;
ROLLBACK;
