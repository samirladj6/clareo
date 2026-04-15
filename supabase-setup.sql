-- =============================================
-- CLAREO BETA — Tables & données de démo
-- Exécuter dans Supabase SQL Editor
-- =============================================

-- 1. Employés
CREATE TABLE IF NOT EXISTS employees (
  id BIGSERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  role TEXT,
  department TEXT,
  status TEXT DEFAULT 'En poste',
  start_date DATE,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Transactions bancaires
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  category TEXT,
  type TEXT CHECK (type IN ('credit', 'debit')),
  date DATE NOT NULL,
  account TEXT DEFAULT 'Compte courant',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT,
  total_amount NUMERIC(12,2) NOT NULL,
  spent_amount NUMERIC(12,2) DEFAULT 0,
  period TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Congés
CREATE TABLE IF NOT EXISTS leaves (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT REFERENCES employees(id),
  type TEXT DEFAULT 'Congé payé',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'En attente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Données de démo
-- =============================================

-- Employés
INSERT INTO employees (first_name, last_name, email, role, department, status, start_date, phone) VALUES
  ('Julie', 'Dupont', 'julie.dupont@clareo.fr', 'Directrice commerciale', 'Commercial', 'En poste', '2022-03-15', '06 12 34 56 78'),
  ('Thomas', 'Martin', 'thomas.martin@clareo.fr', 'Développeur senior', 'Technique', 'En poste', '2021-09-01', '06 23 45 67 89'),
  ('Sophie', 'Leroy', 'sophie.leroy@clareo.fr', 'Comptable', 'Finance', 'En poste', '2023-01-10', '06 34 56 78 90'),
  ('Pierre', 'Moreau', 'pierre.moreau@clareo.fr', 'Chef de projet', 'Technique', 'En poste', '2022-06-20', '06 45 67 89 01'),
  ('Marie', 'Bernard', 'marie.bernard@clareo.fr', 'Chargée RH', 'RH', 'En poste', '2023-05-02', '06 56 78 90 12'),
  ('Lucas', 'Petit', 'lucas.petit@clareo.fr', 'Commercial', 'Commercial', 'En poste', '2023-09-15', '06 67 89 01 23'),
  ('Emma', 'Robert', 'emma.robert@clareo.fr', 'Assistante de direction', 'Direction', 'En poste', '2021-01-05', '06 78 90 12 34'),
  ('Antoine', 'Durand', 'antoine.durand@clareo.fr', 'Développeur', 'Technique', 'En congé', '2024-02-01', '06 89 01 23 45'),
  ('Camille', 'Simon', 'camille.simon@clareo.fr', 'Chargée marketing', 'Marketing', 'En poste', '2023-11-20', '06 90 12 34 56'),
  ('Maxime', 'Laurent', 'maxime.laurent@clareo.fr', 'Technicien support', 'Technique', 'En poste', '2024-04-10', '06 01 23 45 67'),
  ('Léa', 'Michel', 'lea.michel@clareo.fr', 'Commerciale', 'Commercial', 'En poste', '2024-06-01', '06 11 22 33 44'),
  ('Hugo', 'Garcia', 'hugo.garcia@clareo.fr', 'Stagiaire développeur', 'Technique', 'En poste', '2026-01-15', '06 55 66 77 88');

-- Transactions bancaires (6 derniers mois)
INSERT INTO transactions (label, amount, category, type, date, account) VALUES
  ('Virement client Dupont SAS', 12400, 'Clients', 'credit', '2026-04-12', 'Compte courant'),
  ('Virement client Martin & Co', 8750, 'Clients', 'credit', '2026-04-10', 'Compte courant'),
  ('Loyer bureau avril', 2850, 'Loyer', 'debit', '2026-04-05', 'Compte courant'),
  ('Salaires mars', 28500, 'Salaires', 'debit', '2026-03-31', 'Compte courant'),
  ('Virement client Leroy SARL', 23100, 'Clients', 'credit', '2026-04-08', 'Compte courant'),
  ('Abonnement serveurs', 189, 'IT', 'debit', '2026-04-01', 'Compte courant'),
  ('Virement client Moreau Inc', 5600, 'Clients', 'credit', '2026-04-02', 'Compte courant'),
  ('Electricité bureau', 245, 'Charges', 'debit', '2026-03-28', 'Compte courant'),
  ('Virement client Petit Group', 17800, 'Clients', 'credit', '2026-04-01', 'Compte courant'),
  ('Assurance RC Pro', 380, 'Assurance', 'debit', '2026-03-25', 'Compte courant'),
  ('Fournitures bureau', 156, 'Fournitures', 'debit', '2026-03-20', 'Compte courant'),
  ('Virement client Tech Solutions', 9200, 'Clients', 'credit', '2026-03-18', 'Compte courant'),
  ('Salaires février', 28500, 'Salaires', 'debit', '2026-02-28', 'Compte courant'),
  ('Loyer bureau mars', 2850, 'Loyer', 'debit', '2026-03-05', 'Compte courant'),
  ('Virement client ABC Corp', 15300, 'Clients', 'credit', '2026-03-15', 'Compte courant'),
  ('Licence logiciel annuelle', 1200, 'IT', 'debit', '2026-03-10', 'Compte courant'),
  ('Virement client DataFlow', 6800, 'Clients', 'credit', '2026-03-05', 'Compte courant'),
  ('Formation équipe', 2400, 'Formation', 'debit', '2026-02-20', 'Compte courant'),
  ('Loyer bureau février', 2850, 'Loyer', 'debit', '2026-02-05', 'Compte courant'),
  ('Virement client NovaTech', 11500, 'Clients', 'credit', '2026-02-25', 'Compte courant'),
  ('Salaires janvier', 28500, 'Salaires', 'debit', '2026-01-31', 'Compte courant'),
  ('Virement client GlobalServ', 19800, 'Clients', 'credit', '2026-02-10', 'Compte courant'),
  ('Matériel informatique', 3200, 'IT', 'debit', '2026-01-20', 'Compte courant'),
  ('Virement client FlexiLog', 7400, 'Clients', 'credit', '2026-01-15', 'Compte courant'),
  ('Loyer bureau janvier', 2850, 'Loyer', 'debit', '2026-01-05', 'Compte courant');

-- Budgets
INSERT INTO budgets (name, department, total_amount, spent_amount, period) VALUES
  ('Marketing digital', 'Marketing', 12000, 8200, '2026'),
  ('IT & Logiciels', 'Technique', 8000, 3400, '2026'),
  ('Recrutement', 'RH', 15000, 14500, '2026'),
  ('Locaux & charges', 'Direction', 40000, 18900, '2026'),
  ('Formation continue', 'RH', 6000, 2400, '2026'),
  ('Commercial & déplacements', 'Commercial', 10000, 5800, '2026');

-- Congés
INSERT INTO leaves (employee_id, type, start_date, end_date, status) VALUES
  (8, 'Congé payé', '2026-04-14', '2026-04-25', 'Approuvé'),
  (1, 'Congé payé', '2026-05-05', '2026-05-16', 'Approuvé'),
  (3, 'RTT', '2026-04-18', '2026-04-18', 'Approuvé'),
  (6, 'Congé payé', '2026-05-20', '2026-05-30', 'En attente'),
  (9, 'Télétravail', '2026-04-16', '2026-04-16', 'Approuvé'),
  (2, 'Congé maladie', '2026-03-10', '2026-03-12', 'Approuvé');

-- =============================================
-- Row Level Security : lecture/écriture publique pour la beta
-- =============================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access employees" ON employees FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public access transactions" ON transactions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public access budgets" ON budgets FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public access leaves" ON leaves FOR ALL TO anon USING (true) WITH CHECK (true);
