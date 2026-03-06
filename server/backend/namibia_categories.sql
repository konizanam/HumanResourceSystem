-- =====================================================
-- NAMIBIA JOB CATEGORIES & SUBCATEGORIES SEED
-- =====================================================

INSERT INTO job_categories (name) VALUES
  ('Mining & Resources'),
  ('Agriculture, Forestry & Fishing'),
  ('Tourism & Hospitality'),
  ('Construction & Infrastructure'),
  ('Financial Services & Banking'),
  ('Information & Communication Technology'),
  ('Healthcare & Medical'),
  ('Education & Training'),
  ('Government & Public Administration'),
  ('Transport, Logistics & Supply Chain'),
  ('Manufacturing & Industry'),
  ('Real Estate & Property'),
  ('Energy & Utilities'),
  ('Legal & Professional Services'),
  ('NGO, Development & Non-Profit'),
  ('Media, Communications & Marketing'),
  ('Security & Investigation'),
  ('Retail & Trade'),
  ('Human Resources & Administration'),
  ('Engineering & Technical'),
  ('Sales & Business Development'),
  ('Environment & Conservation'),
  ('Arts, Culture & Sports'),
  ('Science & Research')
ON CONFLICT DO NOTHING;

-- =====================================================
-- SUBCATEGORIES
-- =====================================================

-- Mining & Resources
WITH cat AS (SELECT id FROM job_categories WHERE name = 'Mining & Resources')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat FROM cat, (VALUES
  ('Diamond Mining'),
  ('Uranium Mining'),
  ('Gold & Base Metals'),
  ('Oil & Gas Exploration'),
  ('Geology & Surveying'),
  ('Mining Engineering'),
  ('Metallurgy & Processing'),
  ('Environmental & Rehabilitation'),
  ('Mine Safety & Health'),
  ('Quarrying & Aggregates')
) AS s(subcat)
ON CONFLICT DO NOTHING;

-- Agriculture, Forestry & Fishing
WITH cat AS (SELECT id FROM job_categories WHERE name = 'Agriculture, Forestry & Fishing')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat FROM cat, (VALUES
  ('Crop Farming'),
  ('Livestock & Ranching'),
  ('Fishing & Aquaculture'),
  ('Agribusiness & Agro-processing'),
  ('Horticulture & Irrigation'),
  ('Agricultural Extension Services'),
  ('Forestry & Timber'),
  ('Veterinary Services'),
  ('Game Farming & Wildlife Ranching'),
  ('Food Safety & Quality Control')
) AS s(subcat)
ON CONFLICT DO NOTHING;

-- Tourism & Hospitality
WITH cat AS (SELECT id FROM job_categories WHERE name = 'Tourism & Hospitality')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat FROM cat, (VALUES
  ('Hotel & Lodge Management'),
  ('Tour Operations & Guiding'),
  ('Safari & Wildlife Tourism'),
  ('Restaurant & Food Service'),
  ('Travel Agency & Ticketing'),
  ('Event & Conference Management'),
  ('Front Office & Reservations'),
  ('Housekeeping & Facilities'),
  ('Eco-Tourism & Community Tourism'),
  ('Cultural & Heritage Tourism')
) AS s(subcat)
ON CONFLICT DO NOTHING;

-- Construction & Infrastructure
WITH cat AS (SELECT id FROM job_categories WHERE name = 'Construction & Infrastructure')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat FROM cat, (VALUES
  ('Civil Engineering & Roads'),
  ('Architecture & Urban Design'),
  ('Project & Site Management'),
  ('Quantity Surveying'),
  ('Electrical Installation'),
  ('Plumbing & Mechanical'),
  ('Structural Engineering'),
  ('Building & Construction'),
  ('Water & Sanitation Infrastructure'),
  ('Land Surveying & GIS')
) AS s(subcat)
ON CONFLICT DO NOTHING;

-- Financial Services & Banking
WITH cat AS (SELECT id FROM job_categories WHERE name = 'Financial Services & Banking')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat FROM cat, (VALUES
  ('Retail & Commercial Banking'),
  ('Investment & Asset Management'),
  ('Insurance & Actuarial'),
  ('Accounting & Auditing'),
  ('Microfinance & Development Finance'),
  ('Tax & Revenue'),
  ('Risk & Compliance'),
  ('Capital Markets & Securities'),
  ('Financial Planning & Advisory'),
  ('Pension & Provident Funds')
) AS s(subcat)
ON CONFLICT DO NOTHING;

-- Information & Communication Technology
WITH cat AS (SELECT id FROM job_categories WHERE name = 'Information & Communication Technology')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat FROM cat, (VALUES
  ('Software Development'),
  ('IT Support & Helpdesk'),
  ('Networking & Infrastructure'),
  ('Telecommunications'),
  ('Cybersecurity'),
  ('Data Analytics & Business Intelligence'),
  ('Cloud & DevOps'),
  ('UI/UX Design'),
  ('ERP & Systems Administration'),
  ('Digital Transformation & Consulting')
) AS s(subcat)
ON CONFLICT DO NOTHING;

-- Healthcare & Medical
WITH cat AS (SELECT id FROM job_categories WHERE name = 'Healthcare & Medical')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat FROM cat, (VALUES
  ('Nursing & Midwifery'),
  ('Physicians & Specialists'),
  ('Pharmacy'),
  ('Dentistry'),
  ('Allied Health Sciences'),
  ('Public Health & Epidemiology'),
  ('Mental Health & Counselling'),
  ('Laboratory & Diagnostics'),
  ('Radiology & Imaging'),
  ('Health Administration & Management')
) AS s(subcat)
ON CONFLICT DO NOTHING;

-- Education & Training
WITH cat AS (SELECT id FROM job_categories WHERE name = 'Education & Training')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat FROM cat, (VALUES
  ('Early Childhood Development'),
  ('Primary Education'),
  ('Secondary Education'),
  ('Higher & Tertiary Education'),
  ('Vocational Education & Training (VET)'),
  ('Special Needs Education'),
  ('Educational Administration'),
  ('Curriculum Development'),
  ('E-Learning & Instructional Design'),
  ('Language & Literacy Teaching')
) AS s(subcat)
ON CONFLICT DO NOTHING;

-- Government & Public Administration
WITH cat AS (SELECT id FROM job_categories WHERE name = 'Government & Public Administration')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat FROM cat, (VALUES
  ('Civil Service & Ministries'),
  ('Regional & Local Government'),
  ('Parastatals & State-Owned Enterprises'),
  ('Defence & Military'),
  ('Police & Law Enforcement'),
  ('Customs & Border Control'),
  ('Policy, Planning & Research'),
  ('Diplomatic & Foreign Affairs'),
  ('Public Works & Services'),
  ('Statistics & National Planning')
) AS s(subcat)
ON CONFLICT DO NOTHING;

-- Transport, Logistics & Supply Chain
WITH cat AS (SELECT id FROM job_categories WHERE name = 'Transport, Logistics & Supply Chain')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat FROM cat, (VALUES
  ('Road Transport & Freight'),
  ('Aviation & Airport Services'),
  ('Shipping, Ports & Maritime (Walvis Bay)'),
  ('Rail Transport'),
  ('Warehousing & Distribution'),
  ('Supply Chain & Procurement'),
  ('Courier & Last-Mile Delivery'),
  ('Fleet Management'),
  ('Customs Clearing & Forwarding'),
  ('Cold Chain & Perishables Logistics')
) AS s(subcat)
ON CONFLICT DO NOTHING;

-- Manufacturing & Industry
WITH cat AS (SELECT id FROM job_categories WHERE name = 'Manufacturing & Industry')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat FROM cat, (VALUES
  ('Food & Beverage Processing'),
  ('Textile & Garment Manufacturing'),
  ('Metal Fabrication & Welding'),
  ('Chemical & Plastics'),
  ('Printing & Packaging'),
  ('Furniture & Wood Products'),
  ('Leather & Hide Processing'),
  ('Industrial Maintenance'),
  ('Quality Control & Assurance'),
  ('Production Planning & Operations')
) AS s(subcat)
ON CONFLICT DO NOTHING;

-- Real Estate & Property
WITH cat AS (SELECT id FROM job_categories WHERE name = 'Real Estate & Property')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat FROM cat, (VALUES
  ('Residential Property Sales'),
  ('Commercial Property'),
  ('Property Management'),
  ('Property Valuation & Appraisal'),
  ('Property Development'),
  ('Conveyancing & Transfer'),
  ('Estate Agency'),
  ('Facilities Management'),
  ('Sectional Title & Body Corporate'),
  ('Land & Title Registration')
) AS s(subcat)
ON CONFLICT DO NOTHING;

-- Energy & Utilities
WITH cat AS (SELECT id FROM job_categories WHERE name = 'Energy & Utilities')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat FROM cat, (VALUES
  ('Solar Energy'),
  ('Wind & Renewable Energy'),
  ('Power Generation & Distribution'),
  ('Electrical Engineering'),
  ('Water & Sanitation'),
  ('Oil & Gas Downstream'),
  ('Energy Policy & Regulation'),
  ('Meter Reading & Revenue'),
  ('Grid & Transmission'),
  ('Energy Auditing & Efficiency')
) AS s(subcat)
ON CONFLICT DO NOTHING;

-- Legal & Professional Services
WITH cat AS (SELECT id FROM job_categories WHERE name = 'Legal & Professional Services')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat FROM cat, (VALUES
  ('Corporate & Commercial Law'),
  ('Labour & Employment Law'),
  ('Criminal Law & Litigation'),
  ('Conveyancing & Property Law'),
  ('Compliance & Regulatory Affairs'),
  ('Intellectual Property'),
  ('Legal Aid & Human Rights'),
  ('Notary & Apostille'),
  ('Paralegal & Legal Administration'),
  ('Dispute Resolution & Arbitration')
) AS s(subcat)
ON CONFLICT DO NOTHING;

-- NGO, Development & Non-Profit
WITH cat AS (SELECT id FROM job_categories WHERE name = 'NGO, Development & Non-Profit')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat FROM cat, (VALUES
  ('Community Development'),
  ('HIV/AIDS & Health Programs'),
  ('Gender & Women Empowerment'),
  ('Youth Development'),
  ('Environmental Conservation'),
  ('Human Rights & Advocacy'),
  ('Food Security & Livelihoods'),
  ('Monitoring, Evaluation & Research (M&E)'),
  ('Fundraising & Grant Management'),
  ('Humanitarian Aid & Relief')
) AS s(subcat)
ON CONFLICT DO NOTHING;

-- Media, Communications & Marketing
WITH cat AS (SELECT id FROM job_categories WHERE name = 'Media, Communications & Marketing')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat FROM cat, (VALUES
  ('Journalism & Broadcasting'),
  ('Public Relations & Communications'),
  ('Advertising & Creative'),
  ('Digital & Social Media'),
  ('Photography & Videography'),
  ('Graphic Design'),
  ('Marketing & Brand Management'),
  ('Publishing & Content Writing'),
  ('Radio & Television Production'),
  ('Market Research & Analytics')
) AS s(subcat)
ON CONFLICT DO NOTHING;

-- Security & Investigation
WITH cat AS (SELECT id FROM job_categories WHERE name = 'Security & Investigation')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat FROM cat, (VALUES
  ('Private Security & Guarding'),
  ('Corporate & Executive Security'),
  ('Investigations & Forensics'),
  ('Risk Management & Advisory'),
  ('Alarm & CCTV Systems'),
  ('Cash-in-Transit'),
  ('Cyber & Information Security'),
  ('Mine & Site Security'),
  ('Border & Port Security'),
  ('Security Training')
) AS s(subcat)
ON CONFLICT DO NOTHING;

-- Retail & Trade
WITH cat AS (SELECT id FROM job_categories WHERE name = 'Retail & Trade')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat FROM cat, (VALUES
  ('Supermarket & Grocery Retail'),
  ('Wholesale & Distribution'),
  ('Fashion & Clothing Retail'),
  ('Electronics & Appliances'),
  ('Hardware & Building Materials'),
  ('Pharmacy & Health Retail'),
  ('Import & Export Trade'),
  ('E-Commerce & Online Retail'),
  ('Auto Parts & Accessories'),
  ('Fast Moving Consumer Goods (FMCG)')
) AS s(subcat)
ON CONFLICT DO NOTHING;

-- Human Resources & Administration
WITH cat AS (SELECT id FROM job_categories WHERE name = 'Human Resources & Administration')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat FROM cat, (VALUES
  ('Recruitment & Talent Acquisition'),
  ('HR Management & Strategy'),
  ('Payroll & Compensation'),
  ('Training & Development'),
  ('Labour Relations & Compliance'),
  ('Office Administration'),
  ('Executive Assistance & Secretarial'),
  ('Records & Document Management'),
  ('Employee Wellness'),
  ('Organisational Development')
) AS s(subcat)
ON CONFLICT DO NOTHING;

-- Engineering & Technical
WITH cat AS (SELECT id FROM job_categories WHERE name = 'Engineering & Technical')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat FROM cat, (VALUES
  ('Mechanical Engineering'),
  ('Electrical & Electronic Engineering'),
  ('Chemical Engineering'),
  ('Industrial & Process Engineering'),
  ('Telecommunications Engineering'),
  ('Structural & Civil Engineering'),
  ('Maintenance & Instrumentation'),
  ('Automation & Control Systems'),
  ('Naval & Marine Engineering'),
  ('Environmental Engineering')
) AS s(subcat)
ON CONFLICT DO NOTHING;

-- Sales & Business Development
WITH cat AS (SELECT id FROM job_categories WHERE name = 'Sales & Business Development')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat FROM cat, (VALUES
  ('Field Sales & Territory Management'),
  ('Key Account Management'),
  ('Business Development & Partnerships'),
  ('Inside Sales & Telesales'),
  ('Technical Sales'),
  ('Insurance Sales'),
  ('Real Estate Sales'),
  ('Automotive Sales'),
  ('FMCG Sales'),
  ('Export & International Sales')
) AS s(subcat)
ON CONFLICT DO NOTHING;

-- Environment & Conservation
WITH cat AS (SELECT id FROM job_categories WHERE name = 'Environment & Conservation')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat FROM cat, (VALUES
  ('Wildlife Conservation & Anti-Poaching'),
  ('Environmental Impact Assessment'),
  ('Climate Change & Sustainability'),
  ('Marine & Coastal Management'),
  ('Conservation Science & Research'),
  ('Park & Reserve Management'),
  ('Waste Management & Recycling'),
  ('Water Resource Management'),
  ('Environmental Law & Compliance'),
  ('Community-Based Natural Resource Management (CBNRM)')
) AS s(subcat)
ON CONFLICT DO NOTHING;

-- Arts, Culture & Sports
WITH cat AS (SELECT id FROM job_categories WHERE name = 'Arts, Culture & Sports')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat FROM cat, (VALUES
  ('Visual Arts & Fine Arts'),
  ('Performing Arts & Theatre'),
  ('Music & Entertainment'),
  ('Film & Television Production'),
  ('Sports Coaching & Training'),
  ('Sports Administration & Management'),
  ('Cultural Heritage & Museums'),
  ('Fashion & Textile Design'),
  ('Craft & Indigenous Art'),
  ('Recreation & Leisure Management')
) AS s(subcat)
ON CONFLICT DO NOTHING;

-- Science & Research
WITH cat AS (SELECT id FROM job_categories WHERE name = 'Science & Research')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat FROM cat, (VALUES
  ('Life Sciences & Biology'),
  ('Chemistry & Materials Science'),
  ('Physics & Mathematics'),
  ('Social Sciences & Anthropology'),
  ('Economics & Development Research'),
  ('Medical & Clinical Research'),
  ('Agricultural Research'),
  ('Geological & Earth Sciences'),
  ('Marine & Freshwater Sciences'),
  ('Data Science & Statistics')
) AS s(subcat)
ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT
  c.name AS category,
  COUNT(s.id) AS subcategory_count
FROM job_categories c
LEFT JOIN job_subcategories s ON s.category_id = c.id
GROUP BY c.name
ORDER BY c.name;
