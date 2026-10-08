# ResolveAI — Verified Digital Grievance Management Platform

ResolveAI is an enterprise-grade digital civic grievance redressal and public infrastructure maintenance platform. It unites citizens, field technicians, and municipal departments with cryptographic integrity, dual-photo before/after repair evidence, on-site GPS verification (Haversine formula within ≤100m tolerance), and advisory Gemini AI vision audits.

---

## 🌟 Core Architecture & Pillars

1. **Citizen Portal (`/citizen`)**:
   - Report civic infrastructure defects (potholes, streetlights, water pipeline leaks, sanitation issues).
   - Live browser GPS tagging with reverse geocoding.
   - Initial photographic damage evidence upload.
   - Real-time status tracking across complete lifecycle.

2. **Field Technician Operations (`/worker`)**:
   - Geofenced active job dispatch and accept workflow.
   - Step-by-step repair transition: `ASSIGNED` → `IN_PROGRESS` → `AWAITING_VERIFICATION`.
   - On-site resolution proof submission requiring live GPS locking and after-repair photograph.
   - Instant comparative feedback with Retake & Resubmit capability.

3. **Department Inspector Review Suite (`/org`)**:
   - Review submitted work with side-by-side Before vs. After imagery.
   - Advisory Gemini AI Multi-Modal Repair Audit (restoration score, confidence, visual consistency analysis).
   - Strict human-in-the-loop governance: only municipal officers hold authority to `Approve & Formally Close` or request `Rework`.

4. **Public Transparency Portal (`/public`)**:
   - Open civic accountability board with public grievance tracking, verified resolution certificates, and anonymized citizen privacy safeguards.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router, Turbopack, Server Actions)
- **Language**: TypeScript (Strict typing)
- **Styling**: Tailwind CSS & Lucide React
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Storage Buckets)
- **AI Verification**: Google Gemini API (`@google/generative-ai`, multimodal vision analysis)
- **Geo-Verification**: Haversine Spherical Distance formula with strict on-site radius enforcement

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ or 20+
- A Supabase project
- A Google Gemini API key

### 2. Environment Configuration
Copy the provided environment template:
```bash
cp .env.example .env.local
```

Fill in your configuration in `.env.local`:
```env
# Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase Project Credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_PROJECT_REF=your_project_ref_here

# Public Client Mirrors
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

> **Security Note**: Never commit `.env` or `.env.local` files to version control. The repository `.gitignore` is configured to prevent credential exposure.

### 3. Database Setup
Apply the core SQL schema located at:
```bash
supabase/migrations/20261007000000_resolveai_core_schema.sql
```
In your Supabase SQL Editor.

### 4. Install Dependencies & Run
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Testing & Build Verification
```bash
# Run unit and integration tests
npm test

# Build for production
npm run build
```

---

## 🌐 Production Deployment

### Deploying on Vercel
1. Push your repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com/new).
3. Set the Environment Variables in the Vercel Project Settings matching `.env.example`:
   - `GEMINI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_PROJECT_REF`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy! Next.js will automatically build and serve the application with high availability.

---

## 📄 License
MIT License. Built for digital public infrastructure transparency.
