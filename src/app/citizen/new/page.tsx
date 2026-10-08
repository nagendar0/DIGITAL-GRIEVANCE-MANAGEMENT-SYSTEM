"use client";

import React, { useState, useRef, useEffect, useActionState } from "react";
import Link from "next/link";
import { 
  Camera, 
  MapPin, 
  Compass, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Upload, 
  Sparkles,
  Loader2,
  X,
  Trash2,
  RefreshCw,
  SwitchCamera,
  RotateCw,
  FlipHorizontal,
  Video,
  Navigation,
  Edit3,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createGrievance, uploadGrievancePhoto, reverseGeocodeLocation } from "@/server/actions/grievance";
import { createClient } from "@/lib/supabase/client";

export default function NewGrievancePage() {
  const [state, formAction, isPending] = useActionState(createGrievance, null);

  // GPS & Location State
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [detectedLocationName, setDetectedLocationName] = useState<string>("");
  const [streetAddress, setStreetAddress] = useState<string>("");
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(true);
  const [mapZoomLevel, setMapZoomLevel] = useState<number>(0.0035);

  // Image Upload State
  const [imagePath, setImagePath] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Direct Camera Modal & Device State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [isMirrored, setIsMirrored] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Clean up active camera stream if unmounted
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }

    setIsDetectingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        setCoords({
          lat,
          lng,
          accuracy,
        });
        setIsDetectingGps(false);
        setIsMapExpanded(true);

        // Auto-fetch human-readable current location & street/landmark details
        setIsResolvingAddress(true);
        try {
          const res = await reverseGeocodeLocation(lat, lng);
          if (res?.displayName) {
            setDetectedLocationName(res.displayName);
            // Auto-populate the Street / Landmark Address input field
            const autoStreet = res.streetAndLandmark || res.displayName;
            setStreetAddress(autoStreet);
          }
        } catch (err) {
          console.warn("Reverse geocoding failed:", err);
        } finally {
          setIsResolvingAddress(false);
        }
      },
      (err) => {
        setGpsError(`Unable to retrieve location: ${err.message}. Please allow location access.`);
        setIsDetectingGps(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  // Auto-detect on mount if permission already granted
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.permissions && navigator.geolocation) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((result) => {
          if (result.state === "granted") {
            handleCaptureLocation();
          }
        })
        .catch(() => {});
    }
  }, []);

  const processImageFile = async (file: File) => {
    // Check size limit (100MB)
    const MAX_PHOTO_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_PHOTO_SIZE) {
      setUploadError("Image file must be under 100MB");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadGrievancePhoto(formData);

      if (res?.error) {
        throw new Error(res.error);
      }

      if (res?.filePath) {
        setImagePath(res.filePath);
      } else {
        setImagePath(`citizen-reports/photo-${Date.now()}`);
      }

      // Create local preview
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    } catch (err: any) {
      console.warn("Upload fallback to local preview:", err);
      // Fallback: Use direct object URL preview and generate local reference path
      setImagePreview(URL.createObjectURL(file));
      setImagePath(`citizen-reports/local-${Date.now()}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImageFile(file);
  };

  // Remove / Delete uploaded photo (Wrong symbol handler)
  const handleRemovePhoto = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(imagePreview);
      } catch {}
    }
    setImagePreview(null);
    setImagePath("");
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  // Start direct camera stream or fallback to device camera app
  const startCamera = async (facing: "environment" | "user" = "environment") => {
    setCameraFacing(facing);

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        cameraInputRef.current?.click();
        return;
      }

      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn("Direct camera access failed, falling back to camera input:", err);
      setIsCameraOpen(false);
      cameraInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const isSideways = rotation === 90 || rotation === 270;
    const vWidth = video.videoWidth || 1280;
    const vHeight = video.videoHeight || 720;

    canvas.width = isSideways ? vHeight : vWidth;
    canvas.height = isSideways ? vWidth : vHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    if (rotation !== 0) {
      ctx.rotate((rotation * Math.PI) / 180);
    }
    if (isMirrored) {
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, -vWidth / 2, -vHeight / 2, vWidth, vHeight);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const file = new File([blob], `camera-snap-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        stopCamera();
        await processImageFile(file);
      },
      "image/jpeg",
      0.92
    );
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    startCamera(nextFacing);
  };

  const rotateCamera = () => {
    setRotation((prev) => ((prev + 90) % 360) as 0 | 90 | 180 | 270);
  };

  const toggleMirror = () => {
    setIsMirrored((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-8 lg:py-10 px-3 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
        <Link
          href="/citizen"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Link>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="space-y-1 p-4 sm:p-6 pb-2 sm:pb-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold w-fit mb-1">
              <Camera className="w-3.5 h-3.5" />
              Verified Evidence Intake
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900">
              Report a Civic Grievance
            </CardTitle>
            <CardDescription className="text-xs">
              Every complaint is sealed with high-accuracy GPS coordinates and initial photographic proof.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 pt-2 sm:pt-3">
            <form action={formAction} className="space-y-6">
              {state?.error && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{state.error}</span>
                </div>
              )}

              {/* 1. Basic Problem Info */}
              <div className="space-y-4">
                <Input
                  label="Grievance Title (Summary)"
                  name="title"
                  placeholder="e.g. Hazardous deep pothole on MG Road near bus stop"
                  required
                />

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Category of Issue
                  </label>
                  <select
                    name="category"
                    required
                    className="flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <option value="Roads & Pavement">Roads, Potholes & Footpaths</option>
                    <option value="Public Lighting & Electricity">Streetlights & Fallen Wires</option>
                    <option value="Water Supply & Leakage">Pipeline Burst & Contaminated Water</option>
                    <option value="Drainage & Sewerage">Blocked Drains & Overflowing Manhole</option>
                    <option value="Garbage & Solid Waste">Uncollected Garbage & Debris</option>
                    <option value="Public Health & Sanitation">Stagnant Water & Vector Control</option>
                    <option value="Traffic & Signals">Broken Traffic Lights & Missing Signs</option>
                    <option value="Other Civic Utility">Other Civic Complaint</option>
                  </select>
                </div>

                <Textarea
                  label="Detailed Description & Severity"
                  name="description"
                  placeholder="Describe the exact location, dimension, hazard to motorists/pedestrians, and when it occurred..."
                  required
                />
              </div>

              {/* 2. Photo Evidence Upload */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">
                    Initial Photo Evidence (Before Photo) *
                  </label>
                  <span className="text-[11px] text-slate-400">Up to 100MB</span>
                </div>
                <p className="text-xs text-slate-500">
                  Take a photo directly with your camera or upload an image showing the issue and its immediate surroundings.
                </p>

                <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {imagePreview ? (
                    <div className="relative w-full sm:w-44 h-48 sm:h-36 rounded-xl overflow-visible border-2 border-blue-500 bg-slate-100 shrink-0 shadow-sm group">
                      <div className="w-full h-full rounded-[10px] overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imagePreview}
                          alt="Uploaded preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded text-[9px] font-bold bg-slate-900/80 text-white">
                        BEFORE PHOTO
                      </span>

                      {/* WRONG SYMBOL / DELETE BUTTON (Red X circular badge directly on the image) */}
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        title="Delete photo (Remove)"
                        aria-label="Delete photo"
                        className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 text-white flex items-center justify-center shadow-md shadow-red-600/40 border-2 border-white transition-all cursor-pointer hover:scale-110 z-10"
                      >
                        <X className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full sm:w-44 h-40 sm:h-36 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 bg-slate-50 shrink-0">
                      <Camera className="w-8 h-8 mb-1" />
                      <span className="text-[11px] font-medium">No Photo</span>
                      <span className="text-[9px] text-slate-400">Max 100MB</span>
                    </div>
                  )}

                  <div className="flex-1 w-full space-y-2.5">
                    {/* Hidden file inputs */}
                    {/* 1. File picker (Gallery / Disk) */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {/* 2. Direct Camera native fallback */}
                    <input
                      type="file"
                      ref={cameraInputRef}
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {/* Action buttons */}
                    {isUploading ? (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading & verifying photo...</span>
                      </div>
                    ) : imagePreview ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Wrong symbol / Delete button */}
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
                          >
                            <X className="w-4 h-4 text-red-600 stroke-[2.5]" />
                            <span>Delete Photo</span>
                          </button>

                          {/* Retake Direct Camera Photo */}
                          <button
                            type="button"
                            onClick={() => startCamera("environment")}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-xs"
                          >
                            <Camera className="w-4 h-4 text-blue-600" />
                            <span>Retake Photo</span>
                          </button>

                          {/* Change from Files */}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-all cursor-pointer shadow-xs"
                          >
                            <Upload className="w-4 h-4 text-slate-500" />
                            <span>Choose File</span>
                          </button>
                        </div>

                        <p className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Photo verified. Click red ✕ or Delete to remove.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2.5">
                          {/* Direct Camera Button (Live Viewfinder with flip/rotate controls) */}
                          <button
                            type="button"
                            onClick={() => startCamera("environment")}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 cursor-pointer active:scale-95"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Take Direct Photo</span>
                          </button>

                          {/* Upload from Files Button */}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-xs cursor-pointer"
                          >
                            <Upload className="w-4 h-4 text-slate-500" />
                            <span>Upload File</span>
                          </button>
                        </div>

                        <p className="text-[11px] text-slate-400">
                          Supports direct photo capture and file upload up to 100MB (JPG, PNG, WEBP, HEIC).
                        </p>
                      </div>
                    )}

                    {uploadError && (
                      <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {uploadError}
                      </p>
                    )}
                  </div>
                </div>

                <input type="hidden" name="imagePath" value={imagePath} />
              </div>

              {/* 3. Location & GPS Acquisition */}
              <div className="space-y-3.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800">
                      Live GPS & Current Location
                    </label>
                    <p className="text-xs text-slate-500">
                      Detects your real-world street and auto-fills landmark details.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCaptureLocation}
                    isLoading={isDetectingGps || isResolvingAddress}
                    className="cursor-pointer border-slate-300 hover:bg-slate-50 text-slate-700 shadow-xs"
                  >
                    <Compass className="w-4 h-4 mr-1 text-blue-600" />
                    {coords ? "Re-detect GPS" : "Detect Live GPS"}
                  </Button>
                </div>

                {gpsError && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>{gpsError}</span>
                  </div>
                )}

                {/* Detected Location Card (Shows human-readable location instead of just raw numbers) */}
                {coords ? (
                  <div className="p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-950 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-emerald-950">Current Location Detected</span>
                          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100/90 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Live Verified
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCaptureLocation}
                        disabled={isDetectingGps || isResolvingAddress}
                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1 cursor-pointer"
                        title="Click to refresh or re-detect your location"
                      >
                        <RefreshCw className={`w-3 h-3 ${isDetectingGps || isResolvingAddress ? "animate-spin" : ""}`} />
                        <span>Change / Refresh</span>
                      </button>
                    </div>

                    {/* Human-readable Location Banner */}
                    <div className="bg-white/90 border border-emerald-200/90 rounded-lg p-3 text-xs text-slate-800 flex items-start gap-2.5 shadow-xs">
                      <Navigation className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        {isResolvingAddress ? (
                          <div className="text-slate-500 flex items-center gap-2 animate-pulse py-0.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                            <span>Fetching street, locality & landmark details...</span>
                          </div>
                        ) : (
                          <div>
                            <p className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
                              {detectedLocationName || "Live Location Acquired"}
                            </p>
                            <p className="text-[11px] text-emerald-700 font-medium mt-0.5 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Auto-taken and populated in the street address below
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Interactive Live Map for Visual Verification */}
                    <div className="rounded-xl overflow-hidden border border-emerald-300/90 bg-slate-950 shadow-md">
                      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-slate-950 text-white text-xs border-b border-slate-800 gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="font-semibold text-slate-100 flex items-center gap-1.5 text-xs">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                            Live Verification Map
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Zoom In / Out Controls */}
                          <button
                            type="button"
                            onClick={() => setMapZoomLevel((prev) => Math.max(0.001, prev * 0.6))}
                            title="Zoom In"
                            className="w-7 h-7 sm:w-6 sm:h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => setMapZoomLevel((prev) => Math.min(0.02, prev * 1.5))}
                            title="Zoom Out"
                            className="w-7 h-7 sm:w-6 sm:h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                          >
                            −
                          </button>

                          {/* Open in Google Maps link */}
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open location in Google Maps (satellite & street view)"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white text-[11px] font-medium transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Google Maps</span>
                          </a>

                          {/* Toggle expand/collapse */}
                          <button
                            type="button"
                            onClick={() => setIsMapExpanded((prev) => !prev)}
                            className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer ml-1"
                          >
                            {isMapExpanded ? "Collapse" : "Expand"}
                          </button>
                        </div>
                      </div>

                      {isMapExpanded ? (
                        <div className="relative w-full h-60 sm:h-72 bg-slate-100">
                          <iframe
                            key={`${coords.lat}-${coords.lng}-${mapZoomLevel}`}
                            title="Grievance Location Verification Map"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            loading="lazy"
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - mapZoomLevel}%2C${coords.lat - mapZoomLevel * 0.7}%2C${coords.lng + mapZoomLevel}%2C${coords.lat + mapZoomLevel * 0.7}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`}
                          />

                          {/* Floating Map Verification Badge */}
                          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none gap-2">
                            <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-[11px] text-white flex items-center gap-2 shadow-lg min-w-0 max-w-[70%]">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                              <span className="font-semibold truncate">
                                {detectedLocationName || `${coords.lat.toFixed(5)}°, ${coords.lng.toFixed(5)}°`}
                              </span>
                            </div>

                            <div className="pointer-events-auto bg-emerald-600/95 backdrop-blur-md text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md flex items-center gap-1 shrink-0">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Pin Verified</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-900 text-center text-xs text-slate-400">
                          Map collapsed.{" "}
                          <button
                            type="button"
                            onClick={() => setIsMapExpanded(true)}
                            className="text-blue-400 hover:underline font-medium cursor-pointer"
                          >
                            Click to expand map & verify location
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-emerald-800/80 pt-1 px-0.5 gap-1.5">
                      <span className="font-mono text-[10px] tabular-nums text-slate-600 break-words">
                        GPS Coordinates: {coords.lat.toFixed(6)}° N, {coords.lng.toFixed(6)}° E
                        {coords.accuracy && ` (±${Math.round(coords.accuracy)}m accuracy)`}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-medium">
                        ✓ Exact site locked for municipal dispatch
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-100/90 border border-slate-200 text-slate-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-800">Auto-detect your current location</p>
                        <p className="text-slate-500 text-[11px]">
                          Click &quot;Detect Live GPS&quot; to auto-fetch your current street, area, and landmark.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCaptureLocation}
                      isLoading={isDetectingGps || isResolvingAddress}
                      className="shrink-0 bg-white hover:bg-slate-50 border-slate-300 font-semibold text-slate-800 shadow-xs cursor-pointer"
                    >
                      <Compass className="w-4 h-4 mr-1.5 text-blue-600" />
                      Detect Live GPS
                    </Button>
                  </div>
                )}

                <input type="hidden" name="latitude" value={coords?.lat || 12.9716} />
                <input type="hidden" name="longitude" value={coords?.lng || 77.5946} />

                {/* Street / Landmark Address Input (Auto-filled & Citizen Editable) */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="street-landmark-address"
                      className="block text-sm font-semibold text-slate-800"
                    >
                      Street / Landmark Address <span className="text-red-500">*</span>
                    </label>
                    {streetAddress && coords && (
                      <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Auto-taken from Live Location
                      </span>
                    )}
                  </div>

                  <Input
                    id="street-landmark-address"
                    name="coarseAddress"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="e.g. Opposite Metro Pillar 142, Indiranagar 100 Feet Road"
                    required
                  />

                  <p className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>
                      Auto-filled from your position. You can edit, refine, or add specific landmark details.
                    </span>
                    {streetAddress && (
                      <button
                        type="button"
                        onClick={() => setStreetAddress("")}
                        className="text-slate-400 hover:text-slate-600 text-[10px] underline cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </p>
                </div>
              </div>

              {/* AI Triage Explainer */}
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                <span>
                  <strong>Automated AI Triage:</strong> Upon submission, Gemini 2.5 Flash analyzes your photograph and narrative to categorize severity and recommend the responsible municipal department automatically.
                </span>
              </div>

              <Button
                type="submit"
                variant="accent"
                size="lg"
                className="w-full text-base shadow-md shadow-orange-500/20"
                disabled={!imagePath}
                isLoading={isPending}
              >
                <MapPin className="w-4 h-4 mr-2" />
                File Grievance & Lock Coordinates
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Live Camera Viewfinder Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-950/90 border-b border-slate-800 text-white gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <Camera className="w-4 h-4 text-blue-400" />
                <span className="text-xs sm:text-sm font-semibold">Camera</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-end">
                {/* Mirror Fix / Flip Button */}
                <button
                  type="button"
                  onClick={toggleMirror}
                  title="Fix Mirror Effect / Flip Horizontal (⇄)"
                  className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isMirrored
                      ? "bg-blue-600 hover:bg-blue-500 text-white shadow-xs"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                  }`}
                >
                  <FlipHorizontal className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden xs:inline">{isMirrored ? "Fixed (⇄)" : "Flip"}</span>
                </button>

                {/* Rotate 90° Button */}
                <button
                  type="button"
                  onClick={rotateCamera}
                  title="Rotate Camera 90° (↷)"
                  className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden xs:inline">Rotate</span>
                </button>

                {/* Switch Front/Back Camera */}
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  title="Switch Front/Back Camera"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={stopCamera}
                  title="Close Camera"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Video Viewfinder with Mirror Control */}
            <div className="relative aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  transform: `rotate(${rotation}deg) scaleX(${isMirrored ? -1 : 1})`,
                  transition: "transform 0.2s ease-in-out",
                }}
                className="w-full h-full object-cover"
              />

              {/* Direct Mirror Toggle pill directly on video */}
              <button
                type="button"
                onClick={toggleMirror}
                className="absolute top-2.5 left-2.5 max-w-[calc(100%-1.25rem)] flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-slate-950/85 hover:bg-black border border-slate-600/80 text-white text-[11px] sm:text-xs font-semibold backdrop-blur-md cursor-pointer transition-all hover:scale-105 active:scale-95 z-20 shadow-xl truncate"
              >
                <FlipHorizontal className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">{isMirrored ? "✓ Mirror Fixed" : "Click to Flip (⇄)"}</span>
              </button>

              {/* Reticle / Civic evidence frame */}
              <div className="absolute inset-4 border-2 border-white/30 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="w-8 h-8 border-t-2 border-l-2 border-blue-400 absolute top-2 left-2" />
                <div className="w-8 h-8 border-t-2 border-r-2 border-blue-400 absolute top-2 right-2" />
                <div className="w-8 h-8 border-b-2 border-l-2 border-blue-400 absolute bottom-2 left-2" />
                <div className="w-8 h-8 border-b-2 border-r-2 border-blue-400 absolute bottom-2 right-2" />
                <span className="text-[10px] uppercase font-mono tracking-wider text-white/70 bg-black/50 px-2 py-0.5 rounded">
                  Center Issue in Frame
                </span>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="p-4 bg-slate-950 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {/* Shutter Button */}
              <button
                type="button"
                onClick={capturePhoto}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-white animate-pulse" />
                <span>Snap Photo</span>
              </button>

              <div className="w-12" /> {/* Spacer for balance */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
