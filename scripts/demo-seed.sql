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
-- Run all three sections in order.
--
-- Row IDs are UUIDs, matching what `crypto.randomUUID()` writes in production.
-- They are not decorative: every server function validates its id arguments
-- with `z.uuid()`, so seed rows keyed on readable slugs load fine but reject
-- every mutation — Mark Paid included.
--
-- The seed is idempotent. It clears this demo user's rows first, so re-running
-- replaces the fixture rather than duplicating it.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Clear previous demo rows for this user. Child rows first — bill_instances
-- and bills carry foreign keys into the tables below them.
-- ---------------------------------------------------------------------
DELETE FROM bill_instances WHERE user_id = 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF';
DELETE FROM bills          WHERE user_id = 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF';
DELETE FROM pay_schedules  WHERE user_id = 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF';

-- ---------------------------------------------------------------------
-- Pay schedules
-- ---------------------------------------------------------------------
INSERT INTO pay_schedules (id, user_id, name, pay_date, is_active, created_at, updated_at) VALUES
  ('3a4db8da-89e5-4237-86d5-bc04af313f69', 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'Mid-month',    15, 1, '2026-01-10T12:00:00.000Z', '2026-01-10T12:00:00.000Z'),
  ('8ff5baea-a4e1-44b6-a832-6de314edd77a', 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'End of month', 28, 1, '2026-01-10T12:00:00.000Z', '2026-01-10T12:00:00.000Z');

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
  ('ee072b3a-84cd-46f5-97e0-a2b335fe7fd8',     'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '3a4db8da-89e5-4237-86d5-bc04af313f69', 'Rent',          185000,  1, NULL, 0, NULL, 'mortgage',      1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('3b70bb11-0a61-4289-a14e-9d3ed549e97e', 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '3a4db8da-89e5-4237-86d5-bc04af313f69', 'Internet',        7999,  5, 'https://example.com/pay', 1, NULL, 'utility',       1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('d52cbeae-0b2e-4501-b0ca-52ba9c3355ed',      'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '3a4db8da-89e5-4237-86d5-bc04af313f69', 'HOA',            18500,  8, NULL, 0, NULL, 'other',         1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('02c60dbf-4464-4f68-9a2f-69448159568a', 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '3a4db8da-89e5-4237-86d5-bc04af313f69', 'Electric',       13542, 10, NULL, 0, NULL, 'utility',       1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('2a8140db-c75c-40f9-98eb-f7cc12e42f8a',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '3a4db8da-89e5-4237-86d5-bc04af313f69', 'Phone',           8500, 12, NULL, 0, NULL, 'utility',       1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('caaf876f-3569-4272-9163-90bf3dfa76ab',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '3a4db8da-89e5-4237-86d5-bc04af313f69', 'Netflix',         2299, 13, NULL, 1, NULL, 'subscription',  1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('207fd302-8541-4df7-b8fd-926e143b1386',   'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '3a4db8da-89e5-4237-86d5-bc04af313f69', 'Car Insurance',  14550, 14, NULL, 0, NULL, 'other',         1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  -- End of month
  ('b2a0ff84-98c9-433d-b558-48a7e02332a3',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '8ff5baea-a4e1-44b6-a832-6de314edd77a', 'Personal Loan',  20000, 18, NULL, 0, NULL, 'personal_loan', 1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('fc8d0e46-8258-469e-b839-83e6248c6c2e',       'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '8ff5baea-a4e1-44b6-a832-6de314edd77a', 'Credit Card',    75000, 20, NULL, 0, NULL, 'credit_card',   1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('c9261c70-77df-4c47-b70d-7d4c4ff9a7a3',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '8ff5baea-a4e1-44b6-a832-6de314edd77a', 'Trash',           4200, 22, NULL, 0, NULL, 'utility',       1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('6fee975e-d5e4-4c6b-aa12-9b5b4ee37bd3',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '8ff5baea-a4e1-44b6-a832-6de314edd77a', 'Water',           6500, 25, NULL, 0, NULL, 'utility',       1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('4891de2c-2a15-4e10-a839-d038e7fc2c19',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '8ff5baea-a4e1-44b6-a832-6de314edd77a', 'Spotify',         1199, 27, NULL, 1, NULL, 'subscription',  1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('e1880438-0ba0-4cfb-ac8f-97d9921bdffc',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '8ff5baea-a4e1-44b6-a832-6de314edd77a', 'Student Loan',   31000, 28, NULL, 0, NULL, 'student_loan',  1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('73f0ab45-b9a9-4813-999e-468c4b5fd82a',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '8ff5baea-a4e1-44b6-a832-6de314edd77a', 'Car Loan',       42550, 28, NULL, 0, NULL, 'car_loan',      1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z'),
  ('a5e1d42d-0a82-4aa3-a9cf-ad06f8438c39',      'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '8ff5baea-a4e1-44b6-a832-6de314edd77a', 'Gym',             3500, 30, NULL, 1, NULL, 'subscription',  1, '2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00.000Z');

-- ---------------------------------------------------------------------
-- Bill instances (ledger). due_date = canonical cycle, paid_at ~ schedule pay date.
-- March / April / May 2026 for every bill (variations on volatile utilities/CC).
-- June 2026: Mid-month bills fully paid; Spotify paid early. Everything else
--             on End-of-month is left unpaid so we get the overdue + upcoming mix.
-- ---------------------------------------------------------------------
INSERT INTO bill_instances (id, user_id, bill_id, due_date, amount_actual, paid_at, created_at, updated_at) VALUES
  -- ============ MARCH 2026 ============
  -- Mid-month bills (paid ~Mar 15)
  ('61b82b3c-51c2-4d38-ac11-ba186d21b6c9',     'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'ee072b3a-84cd-46f5-97e0-a2b335fe7fd8',     '2026-03-01', 185000, '2026-03-14T16:20:00.000Z', '2026-03-14T16:20:00.000Z', '2026-03-14T16:20:00.000Z'),
  ('c44d2406-2f85-4046-9299-7659869464a5', 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '3b70bb11-0a61-4289-a14e-9d3ed549e97e', '2026-03-05',   7999, '2026-03-05T09:00:00.000Z', '2026-03-05T09:00:00.000Z', '2026-03-05T09:00:00.000Z'),
  ('1c9c5bda-58a5-46d9-abbe-dd71cae73f10',      'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'd52cbeae-0b2e-4501-b0ca-52ba9c3355ed',      '2026-03-08',  18500, '2026-03-14T16:21:00.000Z', '2026-03-14T16:21:00.000Z', '2026-03-14T16:21:00.000Z'),
  ('0427bd28-69a2-41c7-bc2c-9c50f3194f8b', 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '02c60dbf-4464-4f68-9a2f-69448159568a', '2026-03-10',  14210, '2026-03-14T16:22:00.000Z', '2026-03-14T16:22:00.000Z', '2026-03-14T16:22:00.000Z'),
  ('518ad0f3-565e-49e3-9a74-717f24ecb0b9',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '2a8140db-c75c-40f9-98eb-f7cc12e42f8a',    '2026-03-12',   8500, '2026-03-14T16:23:00.000Z', '2026-03-14T16:23:00.000Z', '2026-03-14T16:23:00.000Z'),
  ('165227b3-d58f-4a61-9001-5ecc42ae115f',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'caaf876f-3569-4272-9163-90bf3dfa76ab',  '2026-03-13',   2299, '2026-03-13T03:00:00.000Z', '2026-03-13T03:00:00.000Z', '2026-03-13T03:00:00.000Z'),
  ('1272e417-f860-471c-b33e-403f1cb662e2',   'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '207fd302-8541-4df7-b8fd-926e143b1386',   '2026-03-14',  14550, '2026-03-14T16:24:00.000Z', '2026-03-14T16:24:00.000Z', '2026-03-14T16:24:00.000Z'),
  -- End-of-month bills (paid ~Mar 28)
  ('46c0598d-a01e-457f-8683-315e70803f3f',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'b2a0ff84-98c9-433d-b558-48a7e02332a3',    '2026-03-18',  20000, '2026-03-27T17:00:00.000Z', '2026-03-27T17:00:00.000Z', '2026-03-27T17:00:00.000Z'),
  ('7eab30e0-97f3-40d0-b99d-e746da5d7b21',       'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'fc8d0e46-8258-469e-b839-83e6248c6c2e',       '2026-03-20',  68233, '2026-03-27T17:01:00.000Z', '2026-03-27T17:01:00.000Z', '2026-03-27T17:01:00.000Z'),
  ('fd3851ef-1e89-4ca2-92c2-862ab13bda51',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'c9261c70-77df-4c47-b70d-7d4c4ff9a7a3',    '2026-03-22',   4200, '2026-03-27T17:02:00.000Z', '2026-03-27T17:02:00.000Z', '2026-03-27T17:02:00.000Z'),
  ('092fbcea-7342-43cd-b455-5601e7ca62f7',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '6fee975e-d5e4-4c6b-aa12-9b5b4ee37bd3',    '2026-03-25',   6122, '2026-03-27T17:03:00.000Z', '2026-03-27T17:03:00.000Z', '2026-03-27T17:03:00.000Z'),
  ('8ca311e9-1867-4fa8-980b-257764337535',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '4891de2c-2a15-4e10-a839-d038e7fc2c19',  '2026-03-27',   1199, '2026-03-27T03:00:00.000Z', '2026-03-27T03:00:00.000Z', '2026-03-27T03:00:00.000Z'),
  ('7d23e2ee-37b3-4ebb-9824-f34704be08b0',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'e1880438-0ba0-4cfb-ac8f-97d9921bdffc',    '2026-03-28',  31000, '2026-03-27T17:04:00.000Z', '2026-03-27T17:04:00.000Z', '2026-03-27T17:04:00.000Z'),
  ('b0eb01e7-5717-4f45-b958-c82d35103fbc',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '73f0ab45-b9a9-4813-999e-468c4b5fd82a',  '2026-03-28',  42550, '2026-03-27T17:05:00.000Z', '2026-03-27T17:05:00.000Z', '2026-03-27T17:05:00.000Z'),
  ('05c1582b-a4b1-4f2f-8dd1-9590edb166a4',      'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'a5e1d42d-0a82-4aa3-a9cf-ad06f8438c39',      '2026-03-30',   3500, '2026-03-30T03:00:00.000Z', '2026-03-30T03:00:00.000Z', '2026-03-30T03:00:00.000Z'),

  -- ============ APRIL 2026 ============
  ('cecc657c-fbd6-4ded-b28b-a123fdf61df8',     'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'ee072b3a-84cd-46f5-97e0-a2b335fe7fd8',     '2026-04-01', 185000, '2026-04-15T16:20:00.000Z', '2026-04-15T16:20:00.000Z', '2026-04-15T16:20:00.000Z'),
  ('1c10abc9-d94d-4b30-a098-8de96b638584', 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '3b70bb11-0a61-4289-a14e-9d3ed549e97e', '2026-04-05',   7999, '2026-04-05T09:00:00.000Z', '2026-04-05T09:00:00.000Z', '2026-04-05T09:00:00.000Z'),
  ('7218919f-4dd0-4f74-b4fe-72ec4d9ff03e',      'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'd52cbeae-0b2e-4501-b0ca-52ba9c3355ed',      '2026-04-08',  18500, '2026-04-15T16:21:00.000Z', '2026-04-15T16:21:00.000Z', '2026-04-15T16:21:00.000Z'),
  ('b7592e74-8eb3-4a36-b933-b34453e48a1a', 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '02c60dbf-4464-4f68-9a2f-69448159568a', '2026-04-10',  12877, '2026-04-15T16:22:00.000Z', '2026-04-15T16:22:00.000Z', '2026-04-15T16:22:00.000Z'),
  ('c997b670-5035-42df-9976-f581dd2bb48d',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '2a8140db-c75c-40f9-98eb-f7cc12e42f8a',    '2026-04-12',   8500, '2026-04-15T16:23:00.000Z', '2026-04-15T16:23:00.000Z', '2026-04-15T16:23:00.000Z'),
  ('e46d8bf7-5bd8-4493-8055-af7b72a47c42',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'caaf876f-3569-4272-9163-90bf3dfa76ab',  '2026-04-13',   2299, '2026-04-13T03:00:00.000Z', '2026-04-13T03:00:00.000Z', '2026-04-13T03:00:00.000Z'),
  ('892dd8a2-e049-4a45-bab4-fde16d7b1d29',   'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '207fd302-8541-4df7-b8fd-926e143b1386',   '2026-04-14',  14550, '2026-04-15T16:24:00.000Z', '2026-04-15T16:24:00.000Z', '2026-04-15T16:24:00.000Z'),
  ('32e03971-730b-4921-a83a-7dc3b942b7fe',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'b2a0ff84-98c9-433d-b558-48a7e02332a3',    '2026-04-18',  20000, '2026-04-28T17:00:00.000Z', '2026-04-28T17:00:00.000Z', '2026-04-28T17:00:00.000Z'),
  ('11d8fc53-b225-43d6-aa2b-94e4229bf118',       'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'fc8d0e46-8258-469e-b839-83e6248c6c2e',       '2026-04-20',  81245, '2026-04-28T17:01:00.000Z', '2026-04-28T17:01:00.000Z', '2026-04-28T17:01:00.000Z'),
  ('49b167d1-c3ac-4dcf-acef-84a0336dc630',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'c9261c70-77df-4c47-b70d-7d4c4ff9a7a3',    '2026-04-22',   4200, '2026-04-28T17:02:00.000Z', '2026-04-28T17:02:00.000Z', '2026-04-28T17:02:00.000Z'),
  ('47bbd65b-9e16-4dd6-b351-201e41178603',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '6fee975e-d5e4-4c6b-aa12-9b5b4ee37bd3',    '2026-04-25',   6890, '2026-04-28T17:03:00.000Z', '2026-04-28T17:03:00.000Z', '2026-04-28T17:03:00.000Z'),
  ('f70236c1-0d14-4d1c-bd05-c7e1e9b597c0',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '4891de2c-2a15-4e10-a839-d038e7fc2c19',  '2026-04-27',   1199, '2026-04-27T03:00:00.000Z', '2026-04-27T03:00:00.000Z', '2026-04-27T03:00:00.000Z'),
  ('c0fde1b5-c7d9-4cfb-9f41-d1e6ecd431c0',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'e1880438-0ba0-4cfb-ac8f-97d9921bdffc',    '2026-04-28',  31000, '2026-04-28T17:04:00.000Z', '2026-04-28T17:04:00.000Z', '2026-04-28T17:04:00.000Z'),
  ('3b7f1716-9ef5-4381-89f9-b40f8ed35185',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '73f0ab45-b9a9-4813-999e-468c4b5fd82a',  '2026-04-28',  42550, '2026-04-28T17:05:00.000Z', '2026-04-28T17:05:00.000Z', '2026-04-28T17:05:00.000Z'),
  ('41d23945-50ce-49c0-a001-fc8292b896f2',      'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'a5e1d42d-0a82-4aa3-a9cf-ad06f8438c39',      '2026-04-30',   3500, '2026-04-30T03:00:00.000Z', '2026-04-30T03:00:00.000Z', '2026-04-30T03:00:00.000Z'),

  -- ============ MAY 2026 ============
  ('114ca077-330e-49d3-b4c3-59eead227fd2',     'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'ee072b3a-84cd-46f5-97e0-a2b335fe7fd8',     '2026-05-01', 185000, '2026-05-15T16:20:00.000Z', '2026-05-15T16:20:00.000Z', '2026-05-15T16:20:00.000Z'),
  ('a2c89a19-50fa-4528-8b6d-015d5447aef4', 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '3b70bb11-0a61-4289-a14e-9d3ed549e97e', '2026-05-05',   7999, '2026-05-05T09:00:00.000Z', '2026-05-05T09:00:00.000Z', '2026-05-05T09:00:00.000Z'),
  ('bbd53aeb-b69a-4c48-8e7a-4aba0496b60f',      'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'd52cbeae-0b2e-4501-b0ca-52ba9c3355ed',      '2026-05-08',  18500, '2026-05-15T16:21:00.000Z', '2026-05-15T16:21:00.000Z', '2026-05-15T16:21:00.000Z'),
  ('ef0fc074-d5cc-49d1-848c-e7f3c0c8a56c', 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '02c60dbf-4464-4f68-9a2f-69448159568a', '2026-05-10',  13219, '2026-05-15T16:22:00.000Z', '2026-05-15T16:22:00.000Z', '2026-05-15T16:22:00.000Z'),
  ('b547aa59-70c5-4835-80ab-604db6d547f7',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '2a8140db-c75c-40f9-98eb-f7cc12e42f8a',    '2026-05-12',   8500, '2026-05-15T16:23:00.000Z', '2026-05-15T16:23:00.000Z', '2026-05-15T16:23:00.000Z'),
  ('8b762fdc-6099-4b95-8725-50a9a976bbae',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'caaf876f-3569-4272-9163-90bf3dfa76ab',  '2026-05-13',   2299, '2026-05-13T03:00:00.000Z', '2026-05-13T03:00:00.000Z', '2026-05-13T03:00:00.000Z'),
  ('47a81281-d4c3-4503-9b4a-fd837f6c2020',   'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '207fd302-8541-4df7-b8fd-926e143b1386',   '2026-05-14',  14550, '2026-05-15T16:24:00.000Z', '2026-05-15T16:24:00.000Z', '2026-05-15T16:24:00.000Z'),
  ('e88df848-a12c-4e9d-b9e2-0fadf99b6e49',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'b2a0ff84-98c9-433d-b558-48a7e02332a3',    '2026-05-18',  20000, '2026-05-28T17:00:00.000Z', '2026-05-28T17:00:00.000Z', '2026-05-28T17:00:00.000Z'),
  ('19210b35-3129-4314-889d-7964685ce57b',       'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'fc8d0e46-8258-469e-b839-83e6248c6c2e',       '2026-05-20',  72418, '2026-05-28T17:01:00.000Z', '2026-05-28T17:01:00.000Z', '2026-05-28T17:01:00.000Z'),
  ('51b51421-c601-4260-8064-c72fc876ae8e',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'c9261c70-77df-4c47-b70d-7d4c4ff9a7a3',    '2026-05-22',   4200, '2026-05-28T17:02:00.000Z', '2026-05-28T17:02:00.000Z', '2026-05-28T17:02:00.000Z'),
  ('0ad747b6-6b96-4d8b-af40-d90102f8f38c',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '6fee975e-d5e4-4c6b-aa12-9b5b4ee37bd3',    '2026-05-25',   6275, '2026-05-28T17:03:00.000Z', '2026-05-28T17:03:00.000Z', '2026-05-28T17:03:00.000Z'),
  ('f6c598e8-b2af-4caa-8219-0627e3343a4a',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '4891de2c-2a15-4e10-a839-d038e7fc2c19',  '2026-05-27',   1199, '2026-05-27T03:00:00.000Z', '2026-05-27T03:00:00.000Z', '2026-05-27T03:00:00.000Z'),
  ('c2d17121-4d8d-4dda-b10d-79b72cd6d68e',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'e1880438-0ba0-4cfb-ac8f-97d9921bdffc',    '2026-05-28',  31000, '2026-05-28T17:04:00.000Z', '2026-05-28T17:04:00.000Z', '2026-05-28T17:04:00.000Z'),
  ('df0002d4-45b7-4eb9-b7e1-ab5cfb3bc702',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '73f0ab45-b9a9-4813-999e-468c4b5fd82a',  '2026-05-28',  42550, '2026-05-28T17:05:00.000Z', '2026-05-28T17:05:00.000Z', '2026-05-28T17:05:00.000Z'),
  ('dcec4ec9-83f5-4034-a800-c2bbc7096056',      'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'a5e1d42d-0a82-4aa3-a9cf-ad06f8438c39',      '2026-05-30',   3500, '2026-05-30T03:00:00.000Z', '2026-05-30T03:00:00.000Z', '2026-05-30T03:00:00.000Z'),

  -- ============ JUNE 2026 — current month (today = 2026-06-27) ============
  -- Mid-month bills: all paid June 15 session → schedule is "done" for June
  ('cb6f23de-6da3-4cae-b259-105910cd100c',     'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'ee072b3a-84cd-46f5-97e0-a2b335fe7fd8',     '2026-06-01', 185000, '2026-06-14T15:30:00.000Z', '2026-06-14T15:30:00.000Z', '2026-06-14T15:30:00.000Z'),
  ('646a6dab-7589-4a43-a92e-b7087f6a9aea', 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '3b70bb11-0a61-4289-a14e-9d3ed549e97e', '2026-06-05',   7999, '2026-06-05T09:00:00.000Z', '2026-06-05T09:00:00.000Z', '2026-06-05T09:00:00.000Z'),
  ('f506b0df-d65c-4bb1-85ba-bb1aae371100',      'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'd52cbeae-0b2e-4501-b0ca-52ba9c3355ed',      '2026-06-08',  18500, '2026-06-14T15:31:00.000Z', '2026-06-14T15:31:00.000Z', '2026-06-14T15:31:00.000Z'),
  ('63ba1798-e04a-44cb-8abd-697423e5b58f', 'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '02c60dbf-4464-4f68-9a2f-69448159568a', '2026-06-10',  13542, '2026-06-14T15:32:00.000Z', '2026-06-14T15:32:00.000Z', '2026-06-14T15:32:00.000Z'),
  ('17d4a781-23b5-4bc3-9c56-3d8c1ac25088',    'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '2a8140db-c75c-40f9-98eb-f7cc12e42f8a',    '2026-06-12',   8500, '2026-06-14T15:33:00.000Z', '2026-06-14T15:33:00.000Z', '2026-06-14T15:33:00.000Z'),
  ('0d5c53c3-fce7-457a-8ce5-e95f42fc691e',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', 'caaf876f-3569-4272-9163-90bf3dfa76ab',  '2026-06-13',   2299, '2026-06-13T03:00:00.000Z', '2026-06-13T03:00:00.000Z', '2026-06-13T03:00:00.000Z'),
  ('1281a027-90c1-4141-ae00-b0c114a972b9',   'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '207fd302-8541-4df7-b8fd-926e143b1386',   '2026-06-14',  14550, '2026-06-14T15:34:00.000Z', '2026-06-14T15:34:00.000Z', '2026-06-14T15:34:00.000Z'),
  -- End of month: only Spotify (autopay) has hit so far; the rest are unpaid
  ('63231603-f287-4732-b664-6d164075e9f2',  'user_3FjUHBBjJjKkyOlLGcAjtCM6aAF', '4891de2c-2a15-4e10-a839-d038e7fc2c19',  '2026-06-27',   1199, '2026-06-27T03:00:00.000Z', '2026-06-27T03:00:00.000Z', '2026-06-27T03:00:00.000Z');

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
