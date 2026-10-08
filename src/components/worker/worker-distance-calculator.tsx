"use client";

import { useState, useEffect, useCallback } from "react";
import { Navigation, MapPin, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorkerDistanceCalculatorProps {
  targetLatitude: number;
  targetLongitude: number;
  compact?: boolean;
}

export function WorkerDistanceCalculator({
  targetLatitude,
  targetLongitude,
  compact = false,
}: WorkerDistanceCalculatorProps) {
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const calculateDistance = useCallback((workerLat: number, workerLon: number) => {
    const R = 6371e3; // Earth's radius in meters
    const phi1 = (workerLat * Math.PI) / 180;
    const phi2 = (targetLatitude * Math.PI) / 180;
    const deltaPhi = ((targetLatitude - workerLat) * Math.PI) / 180;
    const deltaLambda = ((targetLongitude - workerLon) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }, [targetLatitude, targetLongitude]);

  const updateLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by device.");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLat = position.coords.latitude;
        const currentLon = position.coords.longitude;
        setAccuracy(Math.round(position.coords.accuracy));
        const dist = calculateDistance(currentLat, currentLon);
        setDistanceMeters(dist);
        setLoading(false);
      },
      (err) => {
        console.warn("Worker geolocation error:", err);
        setError("GPS signal unavailable. Enable device location permissions.");
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  }, [calculateDistance]);

  useEffect(() => {
    updateLocation();
  }, [updateLocation]);

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${meters} meters`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const isWithinSiteRadius = distanceMeters !== null && distanceMeters <= 100;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs font-medium">
        {loading ? (
          <span className="text-slate-400 flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Acquiring GPS...
          </span>
        ) : distanceMeters !== null ? (
          <span
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
              isWithinSiteRadius
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                : "bg-blue-50 text-blue-700 border border-blue-200"
            }`}
          >
            <MapPin className="w-3 h-3" />
            <strong>{formatDistance(distanceMeters)}</strong>
            <span className="text-[10px] opacity-80">
              {isWithinSiteRadius ? "(At Site)" : "away"}
            </span>
          </span>
        ) : (
          <button
            type="button"
            onClick={updateLocation}
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            <MapPin className="w-3 h-3" />
            Calculate Distance
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5 text-blue-600" />
          Live GPS Distance to Incident Site
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={updateLocation}
          disabled={loading}
          className="h-6 text-[11px] px-2 text-slate-600 hover:text-slate-900"
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          Acquiring device GPS fix and computing Haversine distance...
        </div>
      ) : error ? (
        <div className="p-2.5 bg-amber-50 rounded-lg text-xs text-amber-800 flex items-center gap-2 border border-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      ) : distanceMeters !== null ? (
        <div className="space-y-2">
          <div
            className={`p-3 rounded-lg border flex items-center justify-between ${
              isWithinSiteRadius
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-slate-50 border-slate-200 text-slate-800"
            }`}
          >
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold opacity-75">
                Current Distance
              </p>
              <p className="text-lg font-extrabold tabular-nums">
                {formatDistance(distanceMeters)}
              </p>
            </div>
            {isWithinSiteRadius ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Within 100m Site Zone
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-500">
                Target Zone: ≤ 100m
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
            <span>
              Target: {targetLatitude.toFixed(5)}, {targetLongitude.toFixed(5)}
            </span>
            {accuracy && <span>GPS Accuracy: ±{accuracy}m</span>}
          </div>
        </div>
      ) : null}
    </div>
  );
}
