import React from "react";
import Link from "next/link";
import { 
  Shield, 
  MapPin, 
  Sparkles, 
  Building2, 
  HardHat, 
  CheckCircle2, 
  ArrowRight, 
  Compass, 
  Lock, 
  FileCheck2,
  Clock,
  Eye,
  Camera,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { FaqSection } from "@/components/landing/faq-section";
import { ScrollToTop } from "@/components/landing/scroll-to-top";
import { Cpu, Scale, CheckCheck, MapPinned } from "lucide-react";

import { redirect } from "next/navigation";
import { getCurrentUserWithRole } from "@/lib/auth/get-user";
import { getDashboardRoute } from "@/lib/auth/routes";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUserWithRole();
  if (user) {
    redirect(getDashboardRoute(user.role));
  }
  const sampleResolutions = [
    {
      id: "RV-1042",
      category: "Roads & Pavement",
      title: "Arterial Road Pothole Repaired",
      location: "MG Road, Ward 14",
      beforeImg: "/showcase/pothole_before.jpg",
      afterImg: "/showcase/pothole_after.jpg",
      resolvedTime: "18 hrs",
      gpsDistance: "14.2 m",
      orgName: "Public Works Department",
    },
    {
      id: "RV-1038",
      category: "Public Lighting",
      title: "Broken Streetlight Mast Replaced",
      location: "Sector 4, Cross 2",
      beforeImg: "/showcase/streetlight_before.jpg",
      afterImg: "/showcase/streetlight_after.jpg",
      resolvedTime: "11 hrs",
      gpsDistance: "8.5 m",
      orgName: "Electricity Supply Corp",
    },
    {
      id: "RV-1025",
      category: "Water & Sanitation",
      title: "Main Pipeline Burst Sealed",
      location: "Railway Colony, North Gate",
      beforeImg: "/showcase/pipeline_before.jpg",
      afterImg: "/showcase/pipeline_after.jpg",
      resolvedTime: "26 hrs",
      gpsDistance: "21.0 m",
      orgName: "Municipal Water Board",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/50 via-white to-slate-50 pt-12 sm:pt-16 pb-16 sm:pb-24 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-5 sm:space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Full-Cycle Verified Civic Resolution Platform</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.18] sm:leading-[1.15]">
              Real-World Problems. <br />
              <span className="text-blue-600">Verified Evidence.</span> <br />
              Permanent Accountability.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              Citizens capture issues with GPS coordinates. AI assists triage and visual evidence comparison. Field technicians submit verifiable proof. Only official organization approval closes a case.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2 sm:pt-4">
              <Link href="/citizen/new" className="w-full sm:w-auto">
                <Button variant="accent" size="lg" className="w-full sm:w-auto shadow-lg shadow-orange-500/20 text-base">
                  <MapPin className="w-4 h-4 mr-2" />
                  Report a Grievance Now
                </Button>
              </Link>
              <Link href="/public" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-base">
                  <Eye className="w-4 h-4 mr-2 text-slate-500" />
                  View Public Transparency Portal
                </Button>
              </Link>
            </div>

            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-600" />
                No Client Role Tampering
              </span>
              <span className="flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-blue-600" />
                Haversine GPS Verification
              </span>
              <span className="flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-purple-600" />
                Immutable State Machine
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Metrics Counter */}
      <section className="bg-white border-b border-slate-200 py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 text-center">
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">1,482</p>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
                Grievances Filed
              </p>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tabular-nums">1,329</p>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
                Verified & Resolved
              </p>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 tabular-nums">22.4 hrs</p>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
                Avg Turnaround
              </p>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">98.6%</p>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
                GPS Verification Rate
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - The Lifecycle */}
      <section id="how-it-works" className="scroll-mt-16 py-14 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16 space-y-3">
            <Badge variant="info">End-to-End Governance Protocol</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              How ResolveAI Enforces Resolution
            </h2>
            <p className="text-slate-600 text-sm">
              ONE permanent record in Supabase. Controlled by a server-side state machine where no party can fake completion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="relative overflow-hidden border-slate-200 bg-white hover:border-blue-300 transition-colors">
              <div className="h-1.5 w-full bg-blue-600" />
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg mb-2">
                  1
                </div>
                <CardTitle>Citizen Reports with GPS</CardTitle>
                <CardDescription>
                  Capture problem photo + description + high-precision browser coordinates.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-slate-500 leading-relaxed">
                The record is immediately locked as <span className="font-semibold text-amber-700">PENDING</span>. Gemini 2.5 Flash classifies category, assigns severity, and suggests the routing department.
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-slate-200 bg-white hover:border-blue-300 transition-colors">
              <div className="h-1.5 w-full bg-indigo-600" />
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-2">
                  2
                </div>
                <CardTitle>Organization Assigns Worker</CardTitle>
                <CardDescription>
                  Verified department allocates a technician based on skill and workload.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-slate-500 leading-relaxed">
                Transitions strictly: <span className="font-mono text-slate-700">ASSIGNED &rarr; ACCEPTED &rarr; IN_PROGRESS</span>. The technician receives GPS directions and original photo evidence.
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-slate-200 bg-white hover:border-blue-300 transition-colors">
              <div className="h-1.5 w-full bg-emerald-600" />
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg mb-2">
                  3
                </div>
                <CardTitle>GPS Math & AI Verification</CardTitle>
                <CardDescription>
                  Technician submits after-photo, notes, and live GPS from the repair site.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-slate-500 leading-relaxed">
                The backend computes the exact Haversine distance (&le;100m). Gemini compares before/after photos. Only human organization review marks the case <span className="font-semibold text-emerald-700">CLOSED</span>.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Transparency Showcase - Sample Before/After */}
      <section className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <Badge variant="success">Public Transparency Stream</Badge>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 mt-2">
                Recent Verified Resolutions
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                Real before and after records. All citizen and worker PII stripped for privacy safety.
              </p>
            </div>
            <Link href="/public">
              <Button variant="outline" size="sm">
                Browse Public Portal <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {sampleResolutions.map((item) => (
              <Card key={item.id} className="overflow-hidden border-slate-200 hover:shadow-md transition-shadow">
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1">
                  <div className="relative aspect-4/3 overflow-hidden rounded-l-lg bg-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.beforeImg}
                      alt={`${item.title} - Before Repair`}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                    <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                      BEFORE
                    </span>
                  </div>
                  <div className="relative aspect-4/3 overflow-hidden rounded-r-lg bg-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.afterImg}
                      alt={`${item.title} - Resolved & Restored`}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                    <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                      RESOLVED
                    </span>
                  </div>
                </div>

                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-500">{item.id}</span>
                    <StatusBadge status="CLOSED" />
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 text-base">{item.title}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {item.location} &bull; {item.orgName}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-blue-600" />
                      GPS verified: <strong className="text-slate-900 tabular-nums">{item.gpsDistance}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {item.resolvedTime}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Role Portals Grid */}
      <section id="roles" className="scroll-mt-16 py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Role-Specific Operational Portals
            </h2>
            <p className="text-slate-600 text-sm">
              Each actor operates within their strict boundaries enforced by Supabase Row Level Security.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-slate-200 hover:border-blue-400 transition-colors">
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
                  <MapPin className="w-5 h-5" />
                </div>
                <CardTitle className="text-base">Citizen Portal</CardTitle>
                <CardDescription className="text-xs">
                  Report civic problems, upload photos, and track the immutable timeline.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link href="/citizen">
                  <Button variant="outline" size="sm" className="w-full">
                    Enter Portal
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-slate-200 hover:border-blue-400 transition-colors">
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2">
                  <Building2 className="w-5 h-5" />
                </div>
                <CardTitle className="text-base">Organization Suite</CardTitle>
                <CardDescription className="text-xs">
                  Review queue, assign technicians, inspect evidence, and decide rework.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link href="/org">
                  <Button variant="outline" size="sm" className="w-full">
                    Enter Portal
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-slate-200 hover:border-blue-400 transition-colors">
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
                  <HardHat className="w-5 h-5" />
                </div>
                <CardTitle className="text-base">Field Technician</CardTitle>
                <CardDescription className="text-xs">
                  Mobile-optimized for field workers: accept tasks and submit GPS proof.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link href="/worker">
                  <Button variant="outline" size="sm" className="w-full">
                    Enter Portal
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-slate-200 hover:border-blue-400 transition-colors">
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center mb-2">
                  <Lock className="w-5 h-5" />
                </div>
                <CardTitle className="text-base">Platform Admin</CardTitle>
                <CardDescription className="text-xs">
                  Verify authority credentials, inspect audit trails, and manage system limits.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link href="/admin">
                  <Button variant="outline" size="sm" className="w-full">
                    Enter Portal
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Architectural Pillars - Mathematical & Security Trust */}
      <section className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50/50">
              <Scale className="w-3.5 h-3.5 mr-1" />
              Cryptographic & Spatial Integrity
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Engineered to Prevent False Closures
            </h2>
            <p className="text-slate-600 text-sm">
              Traditional municipal complaint portals rely on honor systems. ResolveAI replaces trust with mathematical proofs and verifiable telemetry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-300 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">Haversine GPS Lock</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Field technicians must be physically within 100 meters of the reported coordinates to submit resolution evidence. Calculated server-side using spherical trigonometry.
              </p>
              <div className="pt-3 border-t border-slate-200 text-[11px] font-mono text-blue-700 font-semibold">
                Radius Limit: &le; 100 meters
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-300 transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">Gemini 2.5 Vision Check</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Multimodal AI compares original citizen damage with field worker after-photos, scoring work quality and flagging potential fraud for human supervisors.
              </p>
              <div className="pt-3 border-t border-slate-200 text-[11px] font-mono text-purple-700 font-semibold">
                Dual-Image Feature Match
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-300 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">Supabase RLS Isolation</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Zero client role escalation. Citizens cannot touch department queues, workers cannot self-close, and organizational approval is strictly enforced at database engine level.
              </p>
              <div className="pt-3 border-t border-slate-200 text-[11px] font-mono text-emerald-700 font-semibold">
                Database-Enforced RBAC
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-300 transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">Immutable Audit Chain</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Every state transition generates a timestamped, signed event log. No grievance can be silently deleted, retroactively edited, or hidden from civic scrutiny.
              </p>
              <div className="pt-3 border-t border-slate-200 text-[11px] font-mono text-amber-700 font-semibold">
                Permanent Event Sourcing
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Municipal SLAs & Turnaround Benchmark */}
      <section className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="max-w-xl space-y-4">
              <Badge variant="info">Institutional Service Level Commitments</Badge>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Guaranteed Response Times by Civic Hazard Level
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Municipalities connected to ResolveAI agree to auditable response windows. Real-time telemetry automatically escalates stalled cases to administrative review.
              </p>
              <div className="pt-2 flex items-center gap-4 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCheck className="w-4 h-4 text-emerald-600" />
                  Auto-Escalation
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCheck className="w-4 h-4 text-blue-600" />
                  Realtime Citizen SMS/In-App Alert
                </span>
              </div>
            </div>

            <div className="w-full lg:max-w-md space-y-4">
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shrink-0" />
                    <span className="font-bold text-slate-900 text-sm">Critical Safety Hazards</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Open manholes, live electric cables, deep road craters</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 font-mono font-bold text-xs shrink-0 self-start sm:self-auto">
                  &lt; 12 Hours
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="font-bold text-slate-900 text-sm">Utility Disruptions</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Water main leaks, broken traffic signals, streetlight outages</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-mono font-bold text-xs shrink-0 self-start sm:self-auto">
                  &lt; 24 Hours
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="font-bold text-slate-900 text-sm">Sanitation & Maintenance</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Garbage accumulation, clogged storm drains, damaged sidewalks</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-mono font-bold text-xs shrink-0 self-start sm:self-auto">
                  &lt; 48 Hours
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive FAQ Section with Smooth Filter Tabs */}
      <FaqSection />

      {/* Call to Action */}
      <section className="bg-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            See a Problem in Your City? Fix it With Proof.
          </h2>
          <p className="text-blue-100 text-base max-w-2xl mx-auto">
            ResolveAI eliminates forgotten complaints and unverified closures. File a grievance in under 60 seconds with location and photo evidence.
          </p>
          <div className="pt-2 flex justify-center">
            <Link href="/citizen/new">
              <Button variant="accent" size="lg" className="shadow-xl shadow-blue-900/30 font-semibold">
                <MapPin className="w-4 h-4 mr-2" />
                Report a Grievance Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Floating Smooth Scroll to Top Widget */}
      <ScrollToTop />
    </div>
  );
}
