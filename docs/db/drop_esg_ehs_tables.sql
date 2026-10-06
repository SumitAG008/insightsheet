-- Remove the leftover ESG / EHS tables from the meldra production database (Neon).
--
-- Why: ESG was removed from the application on 29 Sep 2026 (commit 293a0f5). Its 13 esg_* tables
-- were left in the database on purpose because dropping them cannot be undone. No meldra code
-- reads or writes them.
--
-- How to run (Neon console → SQL Editor, on the production branch):
--   0. Neon → Backup & Restore: create a snapshot / branch first, so this can be rolled back.
--   1. Run STEP 1 and read the results.
--   2. Run STEP 2. It stops without changing anything if another table still depends on one of them.
--   3. Run STEP 3 to confirm.

-- STEP 1 — look before deleting --------------------------------------------------------------

-- 1a. The tables that will be dropped.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  AND (table_name LIKE 'esg\_%' OR table_name LIKE 'ehs\_%')
ORDER BY table_name;

-- 1b. Any OTHER table with a foreign key into them (should return no rows).
SELECT con.conrelid::regclass AS table_with_reference, con.conname AS constraint_name,
       con.confrelid::regclass AS points_to
FROM pg_constraint con
WHERE con.contype = 'f'
  AND con.confrelid::regclass::text ~ '^(esg|ehs)_'
  AND con.conrelid::regclass::text !~ '^(esg|ehs)_';

-- 1c. Columns in other tables whose name mentions esg / ehs (should return no rows).
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name !~ '^(esg|ehs)_'
  AND (column_name ILIKE '%esg%' OR column_name ILIKE '%ehs%');

-- 1d. Views, functions or sequences named esg / ehs (dropped tables take their own sequences with them).
SELECT 'view' AS kind, table_name AS name FROM information_schema.views
 WHERE table_schema = 'public' AND table_name ~ '^(esg|ehs)_'
UNION ALL
SELECT 'function', routine_name FROM information_schema.routines
 WHERE routine_schema = 'public' AND routine_name ~ '^(esg|ehs)_';

-- STEP 2 — drop them, all in one statement, no CASCADE ---------------------------------------
-- Without CASCADE, Postgres refuses (and changes nothing) if anything outside this set still
-- depends on them. The tables that reference each other are dropped together.
BEGIN;
DO $$
DECLARE
  names text;
BEGIN
  SELECT string_agg(format('%I.%I', table_schema, table_name), ', ')
    INTO names
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    AND (table_name LIKE 'esg\_%' OR table_name LIKE 'ehs\_%');

  IF names IS NULL THEN
    RAISE NOTICE 'No esg_/ehs_ tables found; nothing to do.';
  ELSE
    RAISE NOTICE 'Dropping: %', names;
    EXECUTE 'DROP TABLE ' || names;
  END IF;
END $$;
COMMIT;

-- STEP 3 — confirm (should return no rows) ----------------------------------------------------
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE 'esg\_%' OR table_name LIKE 'ehs\_%');
