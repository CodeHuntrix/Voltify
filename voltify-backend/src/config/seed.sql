-- src/config/seed.sql

-- Example fallback appliances for users if they don't configure any
-- This seed file can be run if you want to populate some dummy initial data 
-- for a specific test user. For now, it's mostly a reference for default appliances.

-- Note: You should replace '00000000-0000-0000-0000-000000000000' with an actual user UUID
-- after they sign up if you wish to seed their account manually.

/*
INSERT INTO appliances (user_id, name, icon, power_kw, avg_hours_day, seasonality) VALUES
('00000000-0000-0000-0000-000000000000', 'Air Conditioner', '❄️', 1.5, 8.0, 'summer'),
('00000000-0000-0000-0000-000000000000', 'Refrigerator', '🧊', 0.25, 24.0, 'all_year'),
('00000000-0000-0000-0000-000000000000', 'Television', '📺', 0.1, 4.0, 'all_year'),
('00000000-0000-0000-0000-000000000000', 'Water Heater', '♨️', 2.0, 1.5, 'winter'),
('00000000-0000-0000-0000-000000000000', 'Washing Machine', '👕', 0.5, 0.5, 'all_year');
*/
