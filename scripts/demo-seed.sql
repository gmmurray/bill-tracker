-- =====================================================================
-- bill chill — demo seed
-- User:  user_3FjUHBBjJjKkyOlLGcAjtCM6aAF
-- App "today": 2026-06-27 (Saturday)
--
-- Designed so the dashboard renders a screenshot-worthy "heavy use" state:
--   * Attention banner shows 4 OVERDUE bills (end-of-month bills past due day)
--   * Active session = "End of month" (June 28 is the nearest unfinished
--     pay date — Mid-month is fully paid, so its next session is July 15)
--   * Row 3 checklist mixes paid / overdue / upcoming on End of month
--   * Donuts land around 53% bill count, 58% dollars for June
--   * Mar / Apr / May ledgers are populated so history looks lived-in
--
-- Run all three sections in order. All IDs are prefixed "demo_" so re-runs
-- and cleanup are easy.
-- =====================================================================

-- ---------------------------------------------------------------------
-- (Optional) clean previous demo rows for this user.
-- Uncomment if you want a clean re-seed.
-- ---------------------------------------------------------------------
-- DELETE FROM bill_instances WHERE user_id = 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF';
-- DELETE FROM bills          WHERE user_id = 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF';
-- DELETE FROM pay_schedules  WHERE user_id = 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF';

-- ---------------------------------------------------------------------
-- Pay schedules
-- ---------------------------------------------------------------------
INSERT INTO pay_schedules (id, user_id, name, pay_date, is_active, created_at, updated_at) VALUES
  ('demo_sched_mid', 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'Mid-month',    15, 1, '2026-01-10T12:00:00.000Z', '2026-01-10T12:00:00.000Z'),
  ('demo_sched_end', 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'End of month', 28, 1, '2026-01-10T12:00:00.000Z', '2026-01-10T12:00:00.000Z');

-- ---------------------------------------------------------------------
-- Bills (15) — amounts in cents
--   Mid-month (paid June)             | End of month (mostly unpaid)
--   01 Rent           185000 mortgage | 18 Personal Loan   20000 personal_loan
--   05 Internet         7999 utility* | 20 Credit Card     75000 credit_card
--   08 HOA             18500 other    | 22 Trash            4200 utility
--   10 Electric        13542 utility  | 25 Water            6500 utility
--   12 Phone            8500 utility  | 27 Spotify          1199 subscription*  (paid early)
--   13 Netflix          2299 sub*     | 28 Student Loan    31000 student_loan
--   14 Car Insurance   14550 other    | 28 Car Loan        42550 car_loan
--                                     | 30 Gym              3500 subscription*
--   *autopay
-- ---------------------------------------------------------------------
INSERT INTO bills (id, user_id, pay_schedule_id, name, amount_expected, due_day_of_month, payment_url, is_auto_pay, notes, category, is_active, created_at, updated_at) VALUES
  -- Mid-month
  ('demo_bill_rent',     'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_sched_mid', 'Rent',          185000,  1, NULL, 0, NULL, 'mortgage',      1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('demo_bill_internet', 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_sched_mid', 'Internet',        7999,  5, 'https://example.com/pay', 1, NULL, 'utility',       1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('demo_bill_hoa',      'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_sched_mid', 'HOA',            18500,  8, NULL, 0, NULL, 'other',         1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('demo_bill_electric', 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_sched_mid', 'Electric',       13542, 10, NULL, 0, NULL, 'utility',       1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('demo_bill_phone',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_sched_mid', 'Phone',           8500, 12, NULL, 0, NULL, 'utility',       1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('demo_bill_netflix',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_sched_mid', 'Netflix',         2299, 13, NULL, 1, NULL, 'subscription',  1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('demo_bill_carins',   'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_sched_mid', 'Car Insurance',  14550, 14, NULL, 0, NULL, 'other',         1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  -- End of month
  ('demo_bill_ploan',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_sched_end', 'Personal Loan',  20000, 18, NULL, 0, NULL, 'personal_loan', 1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('demo_bill_cc',       'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_sched_end', 'Credit Card',    75000, 20, NULL, 0, NULL, 'credit_card',   1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('demo_bill_trash',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_sched_end', 'Trash',           4200, 22, NULL, 0, NULL, 'utility',       1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('demo_bill_water',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_sched_end', 'Water',           6500, 25, NULL, 0, NULL, 'utility',       1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('demo_bill_spotify',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_sched_end', 'Spotify',         1199, 27, NULL, 1, NULL, 'subscription',  1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('demo_bill_sloan',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_sched_end', 'Student Loan',   31000, 28, NULL, 0, NULL, 'student_loan',  1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('demo_bill_carloan',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_sched_end', 'Car Loan',       42550, 28, NULL, 0, NULL, 'car_loan',      1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('demo_bill_gym',      'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_sched_end', 'Gym',             3500, 30, NULL, 1, NULL, 'subscription',  1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z');

-- ---------------------------------------------------------------------
-- Bill instances (ledger). due_date = canonical cycle, paid_at ~ schedule pay date.
-- March / April / May 2026 for every bill (variations on volatile utilities/CC).
-- June 2026: Mid-month bills fully paid; Spotify paid early. Everything else
--             on End-of-month is left unpaid so we get the overdue + upcoming mix.
-- ---------------------------------------------------------------------
INSERT INTO bill_instances (id, user_id, bill_id, due_date, amount_actual, paid_at, created_at, updated_at) VALUES
  -- ============ MARCH 2026 ============
  -- Mid-month bills (paid ~Mar 15)
  ('demo_inst_rent_03',     'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_rent',     '2026-03-01', 185000, '2026-03-14T16:20:00.000Z', '2026-03-14T16:20:00.000Z', '2026-03-14T16:20:00.000Z'),
  ('demo_inst_internet_03', 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_internet', '2026-03-05',   7999, '2026-03-05T09:00:00.000Z', '2026-03-05T09:00:00.000Z', '2026-03-05T09:00:00.000Z'),
  ('demo_inst_hoa_03',      'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_hoa',      '2026-03-08',  18500, '2026-03-14T16:21:00.000Z', '2026-03-14T16:21:00.000Z', '2026-03-14T16:21:00.000Z'),
  ('demo_inst_electric_03', 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_electric', '2026-03-10',  14210, '2026-03-14T16:22:00.000Z', '2026-03-14T16:22:00.000Z', '2026-03-14T16:22:00.000Z'),
  ('demo_inst_phone_03',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_phone',    '2026-03-12',   8500, '2026-03-14T16:23:00.000Z', '2026-03-14T16:23:00.000Z', '2026-03-14T16:23:00.000Z'),
  ('demo_inst_netflix_03',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_netflix',  '2026-03-13',   2299, '2026-03-13T03:00:00.000Z', '2026-03-13T03:00:00.000Z', '2026-03-13T03:00:00.000Z'),
  ('demo_inst_carins_03',   'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_carins',   '2026-03-14',  14550, '2026-03-14T16:24:00.000Z', '2026-03-14T16:24:00.000Z', '2026-03-14T16:24:00.000Z'),
  -- End-of-month bills (paid ~Mar 28)
  ('demo_inst_ploan_03',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_ploan',    '2026-03-18',  20000, '2026-03-27T17:00:00.000Z', '2026-03-27T17:00:00.000Z', '2026-03-27T17:00:00.000Z'),
  ('demo_inst_cc_03',       'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_cc',       '2026-03-20',  68233, '2026-03-27T17:01:00.000Z', '2026-03-27T17:01:00.000Z', '2026-03-27T17:01:00.000Z'),
  ('demo_inst_trash_03',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_trash',    '2026-03-22',   4200, '2026-03-27T17:02:00.000Z', '2026-03-27T17:02:00.000Z', '2026-03-27T17:02:00.000Z'),
  ('demo_inst_water_03',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_water',    '2026-03-25',   6122, '2026-03-27T17:03:00.000Z', '2026-03-27T17:03:00.000Z', '2026-03-27T17:03:00.000Z'),
  ('demo_inst_spotify_03',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_spotify',  '2026-03-27',   1199, '2026-03-27T03:00:00.000Z', '2026-03-27T03:00:00.000Z', '2026-03-27T03:00:00.000Z'),
  ('demo_inst_sloan_03',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_sloan',    '2026-03-28',  31000, '2026-03-27T17:04:00.000Z', '2026-03-27T17:04:00.000Z', '2026-03-27T17:04:00.000Z'),
  ('demo_inst_carloan_03',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_carloan',  '2026-03-28',  42550, '2026-03-27T17:05:00.000Z', '2026-03-27T17:05:00.000Z', '2026-03-27T17:05:00.000Z'),
  ('demo_inst_gym_03',      'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_gym',      '2026-03-30',   3500, '2026-03-30T03:00:00.000Z', '2026-03-30T03:00:00.000Z', '2026-03-30T03:00:00.000Z'),

  -- ============ APRIL 2026 ============
  ('demo_inst_rent_04',     'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_rent',     '2026-04-01', 185000, '2026-04-15T16:20:00.000Z', '2026-04-15T16:20:00.000Z', '2026-04-15T16:20:00.000Z'),
  ('demo_inst_internet_04', 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_internet', '2026-04-05',   7999, '2026-04-05T09:00:00.000Z', '2026-04-05T09:00:00.000Z', '2026-04-05T09:00:00.000Z'),
  ('demo_inst_hoa_04',      'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_hoa',      '2026-04-08',  18500, '2026-04-15T16:21:00.000Z', '2026-04-15T16:21:00.000Z', '2026-04-15T16:21:00.000Z'),
  ('demo_inst_electric_04', 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_electric', '2026-04-10',  12877, '2026-04-15T16:22:00.000Z', '2026-04-15T16:22:00.000Z', '2026-04-15T16:22:00.000Z'),
  ('demo_inst_phone_04',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_phone',    '2026-04-12',   8500, '2026-04-15T16:23:00.000Z', '2026-04-15T16:23:00.000Z', '2026-04-15T16:23:00.000Z'),
  ('demo_inst_netflix_04',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_netflix',  '2026-04-13',   2299, '2026-04-13T03:00:00.000Z', '2026-04-13T03:00:00.000Z', '2026-04-13T03:00:00.000Z'),
  ('demo_inst_carins_04',   'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_carins',   '2026-04-14',  14550, '2026-04-15T16:24:00.000Z', '2026-04-15T16:24:00.000Z', '2026-04-15T16:24:00.000Z'),
  ('demo_inst_ploan_04',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_ploan',    '2026-04-18',  20000, '2026-04-28T17:00:00.000Z', '2026-04-28T17:00:00.000Z', '2026-04-28T17:00:00.000Z'),
  ('demo_inst_cc_04',       'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_cc',       '2026-04-20',  81245, '2026-04-28T17:01:00.000Z', '2026-04-28T17:01:00.000Z', '2026-04-28T17:01:00.000Z'),
  ('demo_inst_trash_04',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_trash',    '2026-04-22',   4200, '2026-04-28T17:02:00.000Z', '2026-04-28T17:02:00.000Z', '2026-04-28T17:02:00.000Z'),
  ('demo_inst_water_04',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_water',    '2026-04-25',   6890, '2026-04-28T17:03:00.000Z', '2026-04-28T17:03:00.000Z', '2026-04-28T17:03:00.000Z'),
  ('demo_inst_spotify_04',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_spotify',  '2026-04-27',   1199, '2026-04-27T03:00:00.000Z', '2026-04-27T03:00:00.000Z', '2026-04-27T03:00:00.000Z'),
  ('demo_inst_sloan_04',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_sloan',    '2026-04-28',  31000, '2026-04-28T17:04:00.000Z', '2026-04-28T17:04:00.000Z', '2026-04-28T17:04:00.000Z'),
  ('demo_inst_carloan_04',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_carloan',  '2026-04-28',  42550, '2026-04-28T17:05:00.000Z', '2026-04-28T17:05:00.000Z', '2026-04-28T17:05:00.000Z'),
  ('demo_inst_gym_04',      'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_gym',      '2026-04-30',   3500, '2026-04-30T03:00:00.000Z', '2026-04-30T03:00:00.000Z', '2026-04-30T03:00:00.000Z'),

  -- ============ MAY 2026 ============
  ('demo_inst_rent_05',     'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_rent',     '2026-05-01', 185000, '2026-05-15T16:20:00.000Z', '2026-05-15T16:20:00.000Z', '2026-05-15T16:20:00.000Z'),
  ('demo_inst_internet_05', 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_internet', '2026-05-05',   7999, '2026-05-05T09:00:00.000Z', '2026-05-05T09:00:00.000Z', '2026-05-05T09:00:00.000Z'),
  ('demo_inst_hoa_05',      'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_hoa',      '2026-05-08',  18500, '2026-05-15T16:21:00.000Z', '2026-05-15T16:21:00.000Z', '2026-05-15T16:21:00.000Z'),
  ('demo_inst_electric_05', 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_electric', '2026-05-10',  13219, '2026-05-15T16:22:00.000Z', '2026-05-15T16:22:00.000Z', '2026-05-15T16:22:00.000Z'),
  ('demo_inst_phone_05',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_phone',    '2026-05-12',   8500, '2026-05-15T16:23:00.000Z', '2026-05-15T16:23:00.000Z', '2026-05-15T16:23:00.000Z'),
  ('demo_inst_netflix_05',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_netflix',  '2026-05-13',   2299, '2026-05-13T03:00:00.000Z', '2026-05-13T03:00:00.000Z', '2026-05-13T03:00:00.000Z'),
  ('demo_inst_carins_05',   'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_carins',   '2026-05-14',  14550, '2026-05-15T16:24:00.000Z', '2026-05-15T16:24:00.000Z', '2026-05-15T16:24:00.000Z'),
  ('demo_inst_ploan_05',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_ploan',    '2026-05-18',  20000, '2026-05-28T17:00:00.000Z', '2026-05-28T17:00:00.000Z', '2026-05-28T17:00:00.000Z'),
  ('demo_inst_cc_05',       'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_cc',       '2026-05-20',  72418, '2026-05-28T17:01:00.000Z', '2026-05-28T17:01:00.000Z', '2026-05-28T17:01:00.000Z'),
  ('demo_inst_trash_05',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_trash',    '2026-05-22',   4200, '2026-05-28T17:02:00.000Z', '2026-05-28T17:02:00.000Z', '2026-05-28T17:02:00.000Z'),
  ('demo_inst_water_05',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_water',    '2026-05-25',   6275, '2026-05-28T17:03:00.000Z', '2026-05-28T17:03:00.000Z', '2026-05-28T17:03:00.000Z'),
  ('demo_inst_spotify_05',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_spotify',  '2026-05-27',   1199, '2026-05-27T03:00:00.000Z', '2026-05-27T03:00:00.000Z', '2026-05-27T03:00:00.000Z'),
  ('demo_inst_sloan_05',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_sloan',    '2026-05-28',  31000, '2026-05-28T17:04:00.000Z', '2026-05-28T17:04:00.000Z', '2026-05-28T17:04:00.000Z'),
  ('demo_inst_carloan_05',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_carloan',  '2026-05-28',  42550, '2026-05-28T17:05:00.000Z', '2026-05-28T17:05:00.000Z', '2026-05-28T17:05:00.000Z'),
  ('demo_inst_gym_05',      'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_gym',      '2026-05-30',   3500, '2026-05-30T03:00:00.000Z', '2026-05-30T03:00:00.000Z', '2026-05-30T03:00:00.000Z'),

  -- ============ JUNE 2026 — current month (today = 2026-06-27) ============
  -- Mid-month bills: all paid June 15 session → schedule is "done" for June
  ('demo_inst_rent_06',     'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_rent',     '2026-06-01', 185000, '2026-06-14T15:30:00.000Z', '2026-06-14T15:30:00.000Z', '2026-06-14T15:30:00.000Z'),
  ('demo_inst_internet_06', 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_internet', '2026-06-05',   7999, '2026-06-05T09:00:00.000Z', '2026-06-05T09:00:00.000Z', '2026-06-05T09:00:00.000Z'),
  ('demo_inst_hoa_06',      'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_hoa',      '2026-06-08',  18500, '2026-06-14T15:31:00.000Z', '2026-06-14T15:31:00.000Z', '2026-06-14T15:31:00.000Z'),
  ('demo_inst_electric_06', 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_electric', '2026-06-10',  13542, '2026-06-14T15:32:00.000Z', '2026-06-14T15:32:00.000Z', '2026-06-14T15:32:00.000Z'),
  ('demo_inst_phone_06',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_phone',    '2026-06-12',   8500, '2026-06-14T15:33:00.000Z', '2026-06-14T15:33:00.000Z', '2026-06-14T15:33:00.000Z'),
  ('demo_inst_netflix_06',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_netflix',  '2026-06-13',   2299, '2026-06-13T03:00:00.000Z', '2026-06-13T03:00:00.000Z', '2026-06-13T03:00:00.000Z'),
  ('demo_inst_carins_06',   'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_carins',   '2026-06-14',  14550, '2026-06-14T15:34:00.000Z', '2026-06-14T15:34:00.000Z', '2026-06-14T15:34:00.000Z'),
  -- End of month: only Spotify (autopay) has hit so far; the rest are unpaid
  ('demo_inst_spotify_06',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'demo_bill_spotify',  '2026-06-27',   1199, '2026-06-27T03:00:00.000Z', '2026-06-27T03:00:00.000Z', '2026-06-27T03:00:00.000Z');

-- =====================================================================
-- Expected dashboard state on 2026-06-27:
--   Attention banner: "4 bills need your attention"
--     (Personal Loan, Credit Card, Trash, Water — all OVERDUE)
--   Row 2 donuts: 8 / 15 paid · $2,515.89 of $4,343.39
--   Row 3: Active session "End of month (28th)" with
--     Personal Loan 18  — overdue (peach)
--     Credit Card  20  — overdue (peach)
--     Trash        22  — overdue (peach)
--     Water        25  — overdue (peach)
--     Spotify      27  — paid (struck, auto icon)
--     Student Loan 28  — upcoming
--     Car Loan     28  — upcoming
--     Gym          30  — upcoming (auto icon)
--   Row 4: Upcoming preview lists Student Loan, Car Loan, Gym
-- =====================================================================
