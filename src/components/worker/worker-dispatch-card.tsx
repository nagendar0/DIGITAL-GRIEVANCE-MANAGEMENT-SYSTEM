"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { acceptJob, declineJob } from "@/server/actions/worker-job";
import { 
  Navigation, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Clock, 
  Building2, 
  AlertCircle,
  ExternalLink,
  Flame,
  ArrowRight
} from "lucide-react";

interface WorkerDispatchCardProps {
  grievance: {
    id: string;
    public_id: string;
    title: string;
    description: string;
    category: string;
    priority: string;
    status: string;
    coarse_address: string;
    latitude: number;
    longitude: number;
    created_at: string;
    organizations?: {
      name?: string;
      type?: string;
      official_phone?: string;
    } | null;
  };
  assignmentStatus?: string;
}

export function WorkerDispatchCard({ grievance, assignmentStatus }: WorkerDispatchCardProps) {
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [locLoading, setLocLoading] = useState(true);

  // Compute live Haversine distance from browser GPS
  const computeDistance = useCallback((lat: number, lon: number) => {
    const R = 6371e3;
    const phi1 = (lat * Math.PI) / 180;
    const phi2 = (grievance.latitude * Math.PI) / 180;
    const deltaPhi = ((grievance.latitude - lat) * Math.PI) / 180;
    const deltaLambda = ((grievance.longitude - lon) * Math.PI) / 180;
    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }, [grievance.latitude, grievance.longitude]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = computeDistance(pos.coords.latitude, pos.coords.longitude);
        setDistanceMeters(dist);
        setLocLoading(false);
      },
      () => {
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [computeDistance]);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const res = await acceptJob(grievance.id);
      if (res?.success) {
        setAccepted(true);
      }
    } catch {
      console.error("Failed to accept job");
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      const res = await declineJob(
        grievance.id,
        "Technician declined immediate dispatch. Re-queued for other available technicians."
      );
      if (res?.success) {
        setDeclined(true);
      }
    } catch {
      console.error("Failed to decline job");
    } finally {
      setLoading(false);
    }
  };

  if (declined) {
    return (
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-rose-600 font-medium">
          <XCircle className="w-4 h-4" />
          Dispatch offer declined. Job returned to central department queue for reassignment.
        </span>
        <span className="font-mono text-slate-400">{grievance.public_id}</span>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="p-5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-bold text-sm text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Dispatch Order Accepted! Repair in Progress
          </span>
          <span className="font-mono text-xs font-semibold bg-emerald-200/60 px-2 py-0.5 rounded text-emerald-900">
            {grievance.public_id}
          </span>
        </div>
        <p className="text-xs text-emerald-700">
          The citizen and department have been notified that you accepted this work order. Navigate to the site and begin repairs.
        </p>
        <div className="pt-2 flex items-center gap-2">
          <Link href={`/worker/jobs/${grievance.id}`}>
            <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-8">
              Open Job Details & Repair Log
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${grievance.latitude},${grievance.longitude}`}
            target="_blank"
            rel="noreferrer"
          >
            <Button size="sm" variant="outline" className="text-xs h-8 bg-white border-emerald-300 text-emerald-800">
              <Navigation className="w-3.5 h-3.5 mr-1" />
              Navigate GPS
            </Button>
          </a>
        </div>
      </div>
    );
  }

  const formatDistanceStr = (m: number | null) => {
    if (m === null) return "Locating...";
    if (m < 1000) return `${m} meters`;
    return `${(m / 1000).toFixed(1)} km`;
  };

  const estTimeMin = distanceMeters !== null ? Math.max(2, Math.round((distanceMeters / 1000) * 4)) : null;

  return (
    <div className="bg-white rounded-2xl border-2 border-amber-300/80 shadow-md hover:shadow-lg transition-all overflow-hidden">
      {/* Top Rapido/Delivery style dispatch banner */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-4 py-2 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 fill-white" />
            New On-Site Dispatch Offer
          </span>
        </div>
        <span className="text-[11px] font-mono bg-black/20 px-2 py-0.5 rounded text-white/90">
          {grievance.public_id}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Header: Department + Priority */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Assigned by: <strong>{grievance.organizations?.name || "Civic Authority"}</strong></span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              grievance.priority === "CRITICAL"
                ? "bg-rose-100 text-rose-800"
                : grievance.priority === "HIGH"
                ? "bg-orange-100 text-orange-800"
                : "bg-slate-100 text-slate-700"
            }`}>
              {grievance.priority} Priority
            </span>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              {grievance.category}
            </span>
          </div>
        </div>

        {/* Title and Problem description */}
        <div>
          <h3 className="text-base font-bold text-slate-900 leading-snug">
            {grievance.title}
          </h3>
          <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
            {grievance.description}
          </p>
        </div>

        {/* Live Distance & Location Card (Rapido style) */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{grievance.coarse_address}</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 pl-5">
              <span className="flex items-center gap-1 font-bold text-indigo-700">
                <Navigation className="w-3 h-3 text-indigo-600" />
                {locLoading ? "Calculating distance..." : `${formatDistanceStr(distanceMeters)} away`}
              </span>
              {estTimeMin && (
                <span className="flex items-center gap-1 text-slate-600">
                  <Clock className="w-3 h-3 text-slate-400" />
                  ~{estTimeMin} min transit
                </span>
              )}
            </div>
          </div>

          {/* Turn-by-Turn GPS Map Button */}
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${grievance.latitude},${grievance.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0"
          >
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 bg-white border-blue-200 text-blue-700 hover:bg-blue-50 flex items-center gap-1.5 shadow-2xs w-full sm:w-auto"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Map & Navigate
            </Button>
          </a>
        </div>

        {/* Action Controls: Prominent Accept & Decline */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Accepting immediately updates citizen status to &ldquo;Work in Progress&rdquo;.</span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={handleDecline}
              disabled={loading}
              variant="outline"
              size="sm"
              className="text-xs h-9 px-3 text-rose-700 border-rose-200 hover:bg-rose-50 hover:text-rose-800 w-full sm:w-auto justify-center"
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Decline Offer
            </Button>

            <Button
              onClick={handleAccept}
              disabled={loading}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 flex items-center justify-center gap-1.5 shadow-sm w-full sm:w-auto"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Accept Work Order
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
