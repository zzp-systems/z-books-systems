-- ──────────────────────────────────────────────────────────
-- JJB ARAP — Entities Seed v4 (59 Customers from CRM Master Data)
-- Populates the entities table for ARAP lookup dropdowns
--
-- Run AFTER migration-v6-entities.sql:
--   npx wrangler d1 execute jjb-arap-db --remote --file=seed-v4-entities.sql
-- ──────────────────────────────────────────────────────────

INSERT OR IGNORE INTO entities (id, entity_type, name, tin, is_top_withholding_agent, territory, is_active)
VALUES
-- ── North Mindanao ──
('ent-001', 'Customer', 'BUPHARCO DE',                        '004-356-707-000',   1, 'North Mindanao', 1),
('ent-002', 'Customer', 'REIGNS SALES CORP',                  '741-719-165-00002', 0, 'North Mindanao', 1),
('ent-003', 'Customer', 'ATSON''S AGRI BUSINESS CORP',        '009-373-620-000',   0, 'North Mindanao', 1),
('ent-004', 'Customer', 'GAISANO CITY SUPERMALL',             '006-241-956-006',   1, 'North Mindanao', 1),
('ent-005', 'Customer', 'CLARA CLEAR VENTURES CORP',          '736-531-352-000',   0, 'North Mindanao', 1),
('ent-006', 'Customer', 'ULTRA SHELL MOTORIST CENTER',        '005-487-741-0000',  0, 'North Mindanao', 1),
('ent-007', 'Customer', 'EA-7 INC',                           '451-876-724-00000', 0, 'North Mindanao', 1),
('ent-008', 'Customer', 'PEREZ SHELL STATION CORP',           '421-514-248-0000',  0, 'North Mindanao', 1),
('ent-009', 'Customer', 'EMERALD PHARMACY',                   '741-633-659-0001',  0, 'North Mindanao', 1),
('ent-010', 'Customer', 'UNIPACE CORPORATION',                '000-292-848-0000',  0, 'North Mindanao', 1),
('ent-011', 'Customer', 'ONORAMA SUPERCENTER INC',             '004-991-105-000',   0, 'North Mindanao', 1),
('ent-012', 'Customer', 'EUROPACE INC',                       '006-432-364-002',   0, 'North Mindanao', 1),
('ent-013', 'Customer', 'NEOTRINITY CORP',                    '287-671-259-00003', 0, 'North Mindanao', 1),
('ent-014', 'Customer', 'SILDEMCO',                           '466-414-528-00007', 0, 'North Mindanao', 1),
('ent-015', 'Customer', 'ROSE PHARMACY INC - CDO',            '000-428-068-050',   1, 'North Mindanao', 1),
('ent-016', 'Customer', 'ROJON PHARMACY - MISOR',             '738-807-143-001',   0, 'North Mindanao', 1),
('ent-050', 'Customer', 'LAVINA CANTEEN',                     '319-552-870-000',   0, 'North Mindanao', 1),
('ent-051', 'Customer', 'AM GROCERY',                         '298-114-633-000',   0, 'North Mindanao', 1),
('ent-052', 'Customer', 'ODOY KUSINA',                        '501-724-819-000',   0, 'North Mindanao', 1),
('ent-056', 'Customer', 'WILMA STORE',                        '183-492-705-000',   0, 'North Mindanao', 1),
-- ── East Mindanao ──
('ent-017', 'Customer', 'DAVAO CENTRAL CONVENIENCE STORE',    '005-158-986-079',   0, 'East Mindanao', 1),
('ent-018', 'Customer', 'PIONEER TRADING & SUPPLY CORP',      '000-079-833-00000', 0, 'East Mindanao', 1),
('ent-019', 'Customer', 'VV VENTURES GROUP CO.',              '437-420-985-000',   0, 'East Mindanao', 1),
('ent-020', 'Customer', 'MARAGUSAN GROWERS MULTIPURPOSE',     '005-079-225-000',   0, 'East Mindanao', 1),
('ent-021', 'Customer', 'CIMEM FUELS INC',                    '760-440-792-00002', 0, 'East Mindanao', 1),
('ent-022', 'Customer', 'TRANS EURO SALES AND SERVICES',      '464-637-813-004',   0, 'East Mindanao', 1),
('ent-023', 'Customer', 'FRALLO FOOD VENTURES INC',           '009-833-278-000',   0, 'East Mindanao', 1),
('ent-024', 'Customer', 'HONEY''S HOTEL & RESTAURANT',        '403-937-947-000',   0, 'East Mindanao', 1),
('ent-025', 'Customer', 'BARYO EATERY',                       '678-284-193-00000', 0, 'East Mindanao', 1),
('ent-026', 'Customer', 'TRES MARIOS CAFETERIA',              '933-085-512-000',   0, 'East Mindanao', 1),
('ent-027', 'Customer', 'JHG TRADING INC JS GAISANO',         '004-272-277-008',   1, 'East Mindanao', 1),
('ent-028', 'Customer', 'ASL DURIAN MARKETING',              '492-118-703-000',   0, 'East Mindanao', 1),
('ent-029', 'Customer', 'OXY MEDICURE PHARMACY',              '311-845-920-000',   0, 'East Mindanao', 1),
('ent-030', 'Customer', 'ROJON PHARMACY - TAGUM',             '738-507-143-00072', 0, 'East Mindanao', 1),
('ent-057', 'Customer', 'DAVAO RETAIL OVER-THE-COUNTER',      '000-000-000-000',   0, 'East Mindanao', 1),
-- ── Cebu Central ──
('ent-031', 'Customer', 'SHAMROCK BAKERY AND RESTAURANT',     '000-312-274-00000', 0, 'Cebu Central', 1),
('ent-032', 'Customer', 'CEBU DEVELOPMENT CORP',              '200-017-869-000',   0, 'Cebu Central', 1),
('ent-033', 'Customer', 'PRINCITY INC',                       '426-697-124-000',   0, 'Cebu Central', 1),
('ent-034', 'Customer', 'SARAP VENTURES INC',                 '671-847-268-00000', 0, 'Cebu Central', 1),
('ent-035', 'Customer', 'ONG KIN KING CORP INC',              '001-228-315-00012', 0, 'Cebu Central', 1),
('ent-036', 'Customer', 'GLOBE MERCHANTS INC',                '009-286-630-00000', 0, 'Cebu Central', 1),
('ent-037', 'Customer', 'CEBU DOCTORS UNIVERSITY HOSP',       '000-309-308-000',   0, 'Cebu Central', 1),
('ent-038', 'Customer', 'COLONNADE SUPERMARKET',              '200-019-869-00001', 0, 'Cebu Central', 1),
('ent-039', 'Customer', 'CARLOS A. GOTHONG HOLDINGS',         '229-650-343-000',   0, 'Cebu Central', 1),
('ent-040', 'Customer', '7:7 PHARMACY OPC',                   '804-269-367-000',   0, 'Cebu Central', 1),
('ent-041', 'Customer', 'GAISANO CAPITAL GROUP',              '276-203-707-000',   1, 'Cebu Central', 1),
('ent-042', 'Customer', 'ROSE PHARMACY INC - CEBU',           '000-428-068-010',   1, 'Cebu Central', 1),
-- ── Eastern Visayas ──
('ent-043', 'Customer', 'BOHOL QUALITY CORP',                '000-254-342-00000', 0, 'Eastern Visayas', 1),
('ent-044', 'Customer', 'MARCELA FARMS INC',                  '004-283-221-002',   0, 'Eastern Visayas', 1),
('ent-045', 'Customer', 'ZJF CORP',                           '756-645-030-000',   0, 'Eastern Visayas', 1),
('ent-046', 'Customer', 'BOHOL EZ SUPERMART',                 '918-980-543-00020', 0, 'Eastern Visayas', 1),
('ent-047', 'Customer', 'KNEE SUPERMARKET',                  '358-998-046-000',   0, 'Eastern Visayas', 1),
('ent-048', 'Customer', 'MOLLY DEPARTMENT STORE',            '239-510-842-000',   0, 'Eastern Visayas', 1),
-- ── Universal ──
('ent-049', 'Customer', 'LOKAL KULTURA MINIMART',             '412-883-102-000',   0, 'Universal', 1),
('ent-053', 'Customer', 'CENTRO SUPERSALES INC',              '245-819-301-000',   0, 'Universal', 1),
('ent-058', 'Customer', 'ONLINE & E-COMMERCE CLIENTS',        '000-000-000-000',   0, 'Universal', 1),
('ent-059', 'Customer', 'UNREGISTERED OUTLETS (DR-O.)',       'N/A - EXEMPT',      0, 'Universal', 1),
-- ── Southmin / GenSan ──
('ent-054', 'Customer', 'BRIGADA PHARMACY INCORPORATED',      '007-913-442-000',   0, 'Southmin / GenSan', 1),
('ent-055', 'Customer', 'SOCCSKSARGEN WHITE COAST INC.',      '008-412-985-000',   0, 'Southmin / GenSan', 1);

-- ── Verify ──
-- SELECT entity_type, COUNT(*) as count FROM entities WHERE is_active = 1 GROUP BY entity_type;
-- Expected: Customer = 59
