-- ============================================================================
-- RESOLVEAI MASTER DATABASE SCHEMA
-- Digital Grievance Management and Resolution Platform
-- ============================================================================

-- 1. ENUMS AND CUSTOM TYPES
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('CITIZEN', 'ORG_MEMBER', 'WORKER', 'PLATFORM_ADMIN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE org_type AS ENUM (
    'MUNICIPALITY',
    'PUBLIC_WORKS',
    'WATER_BOARD',
    'ELECTRICITY_BOARD',
    'TRANSPORT_AUTHORITY',
    'SANITATION',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE org_status AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE grievance_status AS ENUM (
    'PENDING',
    'ASSIGNED',
    'ACCEPTED',
    'IN_PROGRESS',
    'AWAITING_VERIFICATION',
    'VERIFIED',
    'CLOSED',
    'REWORK_REQUIRED'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE priority_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE verification_result AS ENUM ('PASS', 'FAIL', 'INCONCLUSIVE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. PUBLIC GRIEVANCE ID SEQUENCE
CREATE SEQUENCE IF NOT EXISTS grievance_seq START WITH 1001;

-- 3. CORE TABLES

-- Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'CITIZEN',
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type org_type NOT NULL DEFAULT 'MUNICIPALITY',
  registration_number TEXT NOT NULL,
  official_email TEXT NOT NULL UNIQUE,
  official_phone TEXT NOT NULL,
  address TEXT NOT NULL,
  logo_url TEXT,
  verification_doc_url TEXT NOT NULL,
  status org_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
  rejection_reason TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organization Members Table
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Workers Table (Technicians belonging to exactly one organization)
CREATE TABLE IF NOT EXISTS public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  skills TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  current_active_jobs INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grievances Table (One permanent record per issue)
CREATE TABLE IF NOT EXISTS public.grievances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id TEXT NOT NULL UNIQUE DEFAULT ('RV-' || nextval('grievance_seq')::text),
  citizen_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  coarse_address TEXT NOT NULL,
  status grievance_status NOT NULL DEFAULT 'PENDING',
  priority priority_level NOT NULL DEFAULT 'MEDIUM',
  assigned_org_id UUID REFERENCES public.organizations(id),
  assigned_worker_id UUID REFERENCES public.workers(id),
  closure_notes TEXT,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grievance Images Table (Before photos and attachments)
CREATE TABLE IF NOT EXISTS public.grievance_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grievance_id UUID NOT NULL REFERENCES public.grievances(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  is_before BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grievance Status History Table (Immutable timeline audit)
CREATE TABLE IF NOT EXISTS public.grievance_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grievance_id UUID NOT NULL REFERENCES public.grievances(id) ON DELETE CASCADE,
  from_status grievance_status,
  to_status grievance_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI Analyses Table (Intake triage & classification)
CREATE TABLE IF NOT EXISTS public.ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grievance_id UUID NOT NULL REFERENCES public.grievances(id) ON DELETE CASCADE,
  suggested_category TEXT,
  suggested_priority priority_level,
  suggested_department TEXT,
  summary TEXT,
  severity_score INTEGER,
  duplicate_score DOUBLE PRECISION,
  raw_response JSONB,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Worker Assignments Table
CREATE TABLE IF NOT EXISTS public.worker_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grievance_id UUID NOT NULL REFERENCES public.grievances(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'REJECTED'
  rejection_reason TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);

-- Completion Evidence Table (Worker submitted proof)
CREATE TABLE IF NOT EXISTS public.completion_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grievance_id UUID NOT NULL REFERENCES public.grievances(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  after_image_url TEXT NOT NULL,
  description TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GPS Verifications Table (Haversine mathematical proof)
CREATE TABLE IF NOT EXISTS public.gps_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL REFERENCES public.completion_evidence(id) ON DELETE CASCADE,
  grievance_id UUID NOT NULL REFERENCES public.grievances(id) ON DELETE CASCADE,
  distance_meters DOUBLE PRECISION NOT NULL,
  allowed_radius_meters DOUBLE PRECISION NOT NULL DEFAULT 100.0,
  result verification_result NOT NULL,
  disclaimer TEXT NOT NULL DEFAULT 'GPS coordinates serve as verification evidence and do not constitute absolute proof against device spoofing.',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI Evidence Verifications Table (Multimodal before/after visual audit)
CREATE TABLE IF NOT EXISTS public.ai_evidence_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL REFERENCES public.completion_evidence(id) ON DELETE CASCADE,
  grievance_id UUID NOT NULL REFERENCES public.grievances(id) ON DELETE CASCADE,
  result verification_result NOT NULL,
  confidence DOUBLE PRECISION NOT NULL,
  relevance_score DOUBLE PRECISION NOT NULL,
  visual_improvement BOOLEAN NOT NULL,
  consistency_notes TEXT NOT NULL,
  reason TEXT NOT NULL,
  raw_analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Resolution Reviews Table (Human Organization Official Decisions)
CREATE TABLE IF NOT EXISTS public.resolution_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grievance_id UUID NOT NULL REFERENCES public.grievances(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
  decision TEXT NOT NULL, -- 'APPROVED', 'REWORK_REQUESTED'
  reason TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  grievance_id UUID REFERENCES public.grievances(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit Logs Table (Immutable security ledger)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id),
  actor_role user_role NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. PERFORMANCE & LOOKUP INDEXES
CREATE INDEX IF NOT EXISTS idx_grievances_status ON public.grievances(status);
CREATE INDEX IF NOT EXISTS idx_grievances_citizen_id ON public.grievances(citizen_id);
CREATE INDEX IF NOT EXISTS idx_grievances_assigned_org ON public.grievances(assigned_org_id);
CREATE INDEX IF NOT EXISTS idx_grievances_assigned_worker ON public.grievances(assigned_worker_id);
CREATE INDEX IF NOT EXISTS idx_history_grievance_id ON public.grievance_status_history(grievance_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.audit_logs(created_at DESC);

-- 5. DEFAULT SYSTEM SETTINGS SEED
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('gps_allowed_radius_m', '100.0'::jsonb, 'Default maximum allowed radius between report GPS and evidence GPS in meters'),
  ('ai_triage_model', '"gemini-2.5-flash"'::jsonb, 'Model used for automatic grievance triage and category mapping'),
  ('duplicate_similarity_threshold', '0.85'::jsonb, 'Threshold above which a grievance is flagged as potential duplicate')
ON CONFLICT (key) DO NOTHING;

-- 6. PUBLIC PRIVACY-SAFE VIEW
CREATE OR REPLACE VIEW public.public_grievances_view AS
SELECT 
  g.id,
  g.public_id,
  g.title,
  g.category,
  g.description,
  g.status,
  g.priority,
  g.coarse_address,
  g.created_at,
  g.closed_at,
  o.name as organization_name,
  (
    SELECT storage_path 
    FROM public.grievance_images 
    WHERE grievance_id = g.id AND is_before = true 
    LIMIT 1
  ) as before_image_path,
  (
    SELECT after_image_url 
    FROM public.completion_evidence 
    WHERE grievance_id = g.id 
    ORDER BY submitted_at DESC 
    LIMIT 1
  ) as after_image_url,
  (
    SELECT distance_meters 
    FROM public.gps_verifications 
    WHERE grievance_id = g.id 
    ORDER BY created_at DESC 
    LIMIT 1
  ) as gps_distance_meters
FROM public.grievances g
LEFT JOIN public.organizations o ON g.assigned_org_id = o.id
WHERE g.status IN ('VERIFIED', 'CLOSED');

-- 7. AUTOMATIC PROFILE TRIGGER ON AUTH.USERS INSERT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Citizen User'),
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'CITIZEN'::user_role)
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS across every table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grievance_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grievance_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completion_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_evidence_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolution_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Profiles: Users see own profile, admins see all, org members see their staff
CREATE POLICY "Profiles read access" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'PLATFORM_ADMIN')
    OR EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Profiles update own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Organizations: Verified orgs public-readable, members read own, admin reads all
CREATE POLICY "Organizations select verified" ON public.organizations
  FOR SELECT TO anon, authenticated
  USING (status = 'VERIFIED' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'PLATFORM_ADMIN'));

CREATE POLICY "Organizations insert onboarding" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Grievances: Citizen reads own, Org reads assigned, Worker reads assigned, Admin reads all
CREATE POLICY "Grievances select policy" ON public.grievances
  FOR SELECT TO authenticated
  USING (
    citizen_id = auth.uid()
    OR assigned_org_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    OR assigned_worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'PLATFORM_ADMIN')
  );

CREATE POLICY "Grievances insert citizen" ON public.grievances
  FOR INSERT TO authenticated
  WITH CHECK (
    citizen_id = auth.uid()
    AND status = 'PENDING'
  );

-- Grievance Images: Readable by grievance viewers, insertable by grievance owner
CREATE POLICY "Grievance images select" ON public.grievance_images
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.grievances g
      WHERE g.id = grievance_id
      AND (
        g.citizen_id = auth.uid()
        OR g.assigned_org_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
        OR g.assigned_worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'PLATFORM_ADMIN')
      )
    )
  );

CREATE POLICY "Grievance images insert" ON public.grievance_images
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.grievances g
      WHERE g.id = grievance_id AND g.citizen_id = auth.uid()
    )
  );

-- Status History: Readable by all parties linked to the grievance
CREATE POLICY "History select policy" ON public.grievance_status_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.grievances g
      WHERE g.id = grievance_id
      AND (
        g.citizen_id = auth.uid()
        OR g.assigned_org_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
        OR g.assigned_worker_id IN (SELECT id FROM public.workers WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'PLATFORM_ADMIN')
      )
    )
  );

-- Notifications: Strictly recipient
CREATE POLICY "Notifications select recipient" ON public.notifications
  FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Notifications update read" ON public.notifications
  FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- System Settings: Read-only for authenticated
CREATE POLICY "Settings read" ON public.system_settings
  FOR SELECT TO authenticated
  USING (true);

-- 9. SUPABASE STORAGE BUCKETS SETUP
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('grievance-images', 'grievance-images', false),
  ('completion-evidence', 'completion-evidence', false),
  ('org-documents', 'org-documents', false),
  ('org-logos', 'org-logos', true),
  ('public-resolved', 'public-resolved', true)
ON CONFLICT (id) DO NOTHING;
