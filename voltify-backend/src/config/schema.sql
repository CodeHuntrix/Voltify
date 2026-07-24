-- src/config/schema.sql

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    provider VARCHAR(50) DEFAULT 'local',
    tier INTEGER DEFAULT 1,
    household_type VARCHAR(50),
    location VARCHAR(100),
    home_type VARCHAR(50),
    coins INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    onboarding_complete BOOLEAN DEFAULT false,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appliances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(20) DEFAULT '⚡',
    power_kw DECIMAL(10,2) NOT NULL,
    avg_hours_day DECIMAL(10,2) DEFAULT 0,
    seasonality VARCHAR(50) DEFAULT 'none',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS monthly_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    bill_amount DECIMAL(10,2) NOT NULL,
    units DECIMAL(10,2) NOT NULL,
    estimated_units DECIMAL(10,2),
    accuracy_pct DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    estimated_units DECIMAL(10,2) NOT NULL,
    estimated_cost DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appliance_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    appliance_id UUID REFERENCES appliances(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    estimated_units DECIMAL(10,2) NOT NULL,
    estimated_pct DECIMAL(5,2) NOT NULL,
    estimated_cost DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS css_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    appliance_id UUID REFERENCES appliances(id) ON DELETE CASCADE,
    setting_type VARCHAR(50) NOT NULL,
    applied_value VARCHAR(50) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
