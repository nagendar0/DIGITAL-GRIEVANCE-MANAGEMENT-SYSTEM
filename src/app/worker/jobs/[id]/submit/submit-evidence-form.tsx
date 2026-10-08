"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { submitEvidence } from "@/server/actions/worker-job";
import { calculateHaversineDistance, ALLOWED_RADIUS_METERS, GPS_VERIFICATION_DISCLAIMER } from "@/lib/geo/haversine";
import { 
  Camera, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Upload, 
  RefreshCw,
  ShieldCheck,
  X 
} from "lucide-react";

interface SubmitEvidenceFormProps {
  grievanceId: string;
  targetLat: number;
  targetLon: number;
  publicId: string;
}

async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 1.5 * 1024 * 1024) {
    return file;
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1920;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const cleanName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const compressedFile = new File([blob], cleanName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export function SubmitEvidenceForm({
  grievanceId,
  targetLat,
  targetLon,
  publicId,
}: SubmitEvidenceFormProps) {
  const router = useRouter();

  // Location state
  const [workerLat, setWorkerLat] = useState<number | null>(null);
  const [workerLon, setWorkerLon] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [haversineInfo, setHaversineInfo] = useState<{
    distanceMeters: number;
    isWithinRadius: boolean;
  } | null>(null);

  // Form inputs
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Acquire Browser GPS
  const acquireLocation = () => {
    setLocationLoading(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setWorkerLat(lat);
        setWorkerLon(lon);

        const check = calculateHaversineDistance(
          { latitude: targetLat, longitude: targetLon },
          { latitude: lat, longitude: lon },
          ALLOWED_RADIUS_METERS
        );

        setHaversineInfo({
          distanceMeters: check.distanceMeters,
          isWithinRadius: check.isWithinRadius,
        });

        setLocationLoading(false);
      },
      (err) => {
        setLocationError(`Location acquisition failed: ${err.message}. Please enable GPS permissions.`);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    acquireLocation();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 100 * 1024 * 1024) {
        setErrorMsg("Photo evidence file must be under 100MB.");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const [verificationFeedback, setVerificationFeedback] = useState<{
    result: string;
    confidence?: number;
    visual_improvement?: boolean;
    reason: string;
    consistency_notes?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!imageFile) {
      setErrorMsg("Please capture or upload an after-repair completion photograph.");
      return;
    }

    if (workerLat === null || workerLon === null) {
      setErrorMsg("A verified on-site GPS lock is required before submission.");
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setErrorMsg("Please provide detailed repair notes (minimum 10 characters).");
      return;
    }

    setSubmitting(true);

    try {
      const fileToUpload = await compressImageIfNeeded(imageFile);
      const formData = new FormData();
      formData.append("grievanceId", grievanceId);
      formData.append("description", description.trim());
      formData.append("latitude", workerLat.toString());
      formData.append("longitude", workerLon.toString());
      formData.append("afterImage", fileToUpload);

      const res = await submitEvidence(formData);

      if (res?.error) {
        setErrorMsg(res.error);
        setSubmitting(false);
      } else if (res?.aiResult) {
        setVerificationFeedback(res.aiResult);
        setSubmitting(false);
        if (res.aiResult.result === "PASS") {
          setTimeout(() => {
            router.push("/worker?tab=completed");
          }, 2800);
        }
      } else {
        router.push("/worker?tab=completed");
      }
    } catch (err: any) {
      console.error("Submit evidence error:", err);
      setErrorMsg(
        err?.message ||
          "An unexpected network error occurred while submitting evidence. Please verify your connection and try again."
      );
      setSubmitting(false);
    }
  };

  if (verificationFeedback) {
    const isPass = verificationFeedback.result === "PASS";
    return (
      <div className={`p-6 rounded-2xl border ${
        isPass ? "bg-emerald-50 border-emerald-300 text-emerald-950" : "bg-rose-50 border-rose-300 text-rose-950"
      } shadow-md space-y-4`}>
        <div className="flex items-center gap-3">
          {isPass ? (
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
          )}
          <div>
            <h3 className="text-base font-bold">
              {isPass ? "AI Verification: PASSED ✓" : "AI Verification: Issues Detected ⚠️"}
            </h3>
            <p className="text-xs opacity-80">
              {isPass
                ? `Comparative analysis confirmed restoration (${Math.round((verificationFeedback.confidence || 0.85) * 100)}% Confidence). Redirecting...`
                : "The submitted photograph did not satisfy resolution criteria. Please review details below."}
            </p>
          </div>
        </div>

        <div className="bg-white/80 p-4 rounded-xl border border-black/10 space-y-2 text-xs">
          <div>
            <strong className="block text-slate-800">Reason / Evaluation:</strong>
            <p className="text-slate-700 leading-relaxed mt-0.5">
              {verificationFeedback.reason}
            </p>
          </div>
          {verificationFeedback.consistency_notes && (
            <div className="pt-2 border-t border-slate-200">
              <strong className="block text-slate-800">Department Inspector Instructions:</strong>
              <p className="text-slate-600 italic mt-0.5">
                {verificationFeedback.consistency_notes}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
          {isPass ? (
            <Button
              onClick={() => router.push("/worker?tab=completed")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4 font-bold w-full sm:w-auto"
            >
              View in Completed Work Tab
            </Button>
          ) : (
            <>
              <Button
                onClick={() => {
                  setVerificationFeedback(null);
                  setImageFile(null);
                  setImagePreview(null);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 px-4 font-bold w-full sm:w-auto"
              >
                Retake Photo & Resubmit
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/worker/jobs/${grievanceId}`)}
                className="text-xs h-9 w-full sm:w-auto"
              >
                Return to Job Dossier
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
      {/* 1. GPS Acquisition Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600 shrink-0" />
            <h3 className="text-sm font-semibold text-slate-900">
              On-Site GPS Verification Lock
            </h3>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={acquireLocation}
            disabled={locationLoading}
            className="text-xs h-8 flex items-center gap-1.5 self-start xs:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${locationLoading ? "animate-spin" : ""}`} />
            Refresh GPS
          </Button>
        </div>

        {locationLoading ? (
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
            <span>Acquiring satellite lock with high accuracy...</span>
          </div>
        ) : locationError ? (
          <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">GPS Error</p>
              <p className="mt-0.5">{locationError}</p>
            </div>
          </div>
        ) : workerLat !== null && workerLon !== null && haversineInfo ? (
          <div className="space-y-3">
            <div className={`p-3.5 rounded-lg border flex items-start gap-3 ${
              haversineInfo.isWithinRadius 
                ? "bg-emerald-50/80 border-emerald-200 text-emerald-900" 
                : "bg-amber-50/80 border-amber-200 text-amber-900"
            }`}>
              {haversineInfo.isWithinRadius ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="text-xs space-y-1">
                <p className="font-bold">
                  {haversineInfo.isWithinRadius
                    ? `Physical Site Match (${haversineInfo.distanceMeters}m from report)`
                    : `Distance Exceeded: ${haversineInfo.distanceMeters}m (>100m tolerance)`}
                </p>
                <p className="font-mono text-[11px] opacity-80 break-all">
                  Current: {workerLat.toFixed(6)}, {workerLon.toFixed(6)} | Target: {targetLat.toFixed(6)}, {targetLon.toFixed(6)}
                </p>
              </div>
            </div>

            {/* Mandatory GPS Disclaimer */}
            <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2.5 rounded-md border border-slate-100">
              * {GPS_VERIFICATION_DISCLAIMER}
            </p>
          </div>
        ) : null}
      </div>

      {/* 2. Photo Upload / Camera Capture */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            Restoration Evidence Photo (After Repair) *
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Capture a well-lit, direct photo showing the completed repair and surrounding reference markers.
          </p>
        </div>

        {imagePreview ? (
          <div className="relative rounded-xl overflow-visible border-2 border-blue-500 bg-slate-100 max-h-72 flex items-center justify-center p-1">
            <img
              src={imagePreview}
              alt="After repair preview"
              className="w-full h-auto max-h-72 object-contain rounded-lg"
            />
            {/* Wrong symbol / Delete button (Red X) */}
            <button
              type="button"
              onClick={() => {
                setImageFile(null);
                setImagePreview(null);
              }}
              title="Delete photo (Remove)"
              aria-label="Delete photo"
              className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white flex items-center justify-center shadow-md shadow-red-600/40 border-2 border-white transition-all cursor-pointer hover:scale-110 z-10"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
            <div className="absolute bottom-2 right-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                }}
                className="bg-red-600/90 hover:bg-red-700 text-white text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                }}
                className="bg-slate-900/80 hover:bg-slate-900 text-white text-xs px-2.5 py-1 rounded-lg shadow-xs cursor-pointer"
              >
                Retake Photo
              </button>
            </div>
          </div>
        ) : (
          <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-5 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/20 text-center">
            <Camera className="w-9 h-9 sm:w-10 sm:h-10 text-slate-400 mb-2" />
            <span className="text-xs font-semibold text-slate-700">
              Take Photo with Camera or Upload Image
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">JPEG, PNG, WebP up to 100MB</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* 3. Repair Notes Description */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
        <label className="block text-sm font-semibold text-slate-900">
          Work Execution & Material Notes *
        </label>
        <p className="text-xs text-slate-500">
          Summarize what work was performed, materials used, and whether any follow-up is needed.
        </p>
        <textarea
          required
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Cleared debris, applied cold asphalt patch, compacted with pneumatic tamper..."
          className="w-full text-xs rounded-lg border border-slate-300 p-3 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
          {errorMsg}
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={submitting || locationLoading || !imageFile}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm h-11 flex items-center justify-center gap-2 shadow-sm font-semibold"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Verifying GPS & Transmitting Evidence...
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4" />
            Submit Resolution Evidence for Inspection
          </>
        )}
      </Button>
    </form>
  );
}
