-- ============================================================
-- NeuroGen Connect - Supabase Database Schema
-- Run this in the Supabase SQL Editor to set up all tables.
-- ============================================================

-- 1. Profiles Table
-- Stores user profile information for both doctors and patients.
-- The 'id' here is the user's custom ID (身份证号 or 工号), NOT the Supabase auth UUID.
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,                -- 身份证号 (18位) or 工号 (10位)
    role TEXT NOT NULL CHECK (role IN ('DOCTOR', 'PATIENT')),
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,         -- bcrypt hashed password
    gender TEXT CHECK (gender IN ('男', '女')),
    age INTEGER,
    phone TEXT,
    department TEXT,                     -- For doctors
    title TEXT,                          -- 职称 (e.g. 主任医师)
    hospital TEXT,                       -- 医院
    specialties TEXT,                    -- 擅长项目
    registration_date TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Medical Cases Table
-- Stores patient-submitted cases for doctor review.
CREATE TABLE IF NOT EXISTS medical_cases (
    id TEXT PRIMARY KEY,                -- Client-generated ID (timestamp string)
    patient_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    image_url TEXT,                      -- URL to Supabase Storage or null
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    doctor_feedback TEXT,
    doctor_name TEXT,
    reply_timestamp TEXT,
    modality TEXT CHECK (modality IN ('CT', 'MRI', 'X-Ray', 'Ultrasound', 'Other')),
    tags TEXT[],                         -- PostgreSQL array of tags
    has_unread_for_doctor BOOLEAN DEFAULT TRUE,
    has_unread_for_patient BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Case Messages Table
-- Stores the chat history within a medical case.
CREATE TABLE IF NOT EXISTS case_messages (
    id TEXT PRIMARY KEY,                -- Client-generated ID
    case_id TEXT NOT NULL REFERENCES medical_cases(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL REFERENCES profiles(id),
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('DOCTOR', 'PATIENT')),
    text TEXT NOT NULL,
    timestamp TEXT NOT NULL,            -- Display timestamp string
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Analysis Results Table (Optional: for caching AI analysis)
CREATE TABLE IF NOT EXISTS analysis_results (
    id SERIAL PRIMARY KEY,
    case_id TEXT REFERENCES medical_cases(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES profiles(id),
    result_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cases_patient_id ON medical_cases(patient_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON medical_cases(status);
CREATE INDEX IF NOT EXISTS idx_messages_case_id ON case_messages(case_id);
CREATE INDEX IF NOT EXISTS idx_analysis_case_id ON analysis_results(case_id);

-- Row Level Security (RLS) Policies
-- For simplicity in this MVP, RLS is disabled. The backend controls access.
-- In production, enable RLS and add policies per Supabase best practices.
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE medical_cases ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE case_messages ENABLE ROW LEVEL SECURITY;
