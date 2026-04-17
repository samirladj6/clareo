-- Script à exécuter dans Supabase SQL Editor pour remettre à zéro la base
-- (utile avant chaque démo client)

TRUNCATE TABLE transactions RESTART IDENTITY CASCADE;
TRUNCATE TABLE employees RESTART IDENTITY CASCADE;
TRUNCATE TABLE budgets RESTART IDENTITY CASCADE;
TRUNCATE TABLE leaves RESTART IDENTITY CASCADE;
TRUNCATE TABLE datasets RESTART IDENTITY CASCADE;

-- Vérification
SELECT 'transactions' AS table_name, COUNT(*) AS rows FROM transactions
UNION ALL SELECT 'employees', COUNT(*) FROM employees
UNION ALL SELECT 'budgets', COUNT(*) FROM budgets
UNION ALL SELECT 'leaves', COUNT(*) FROM leaves
UNION ALL SELECT 'datasets', COUNT(*) FROM datasets;
