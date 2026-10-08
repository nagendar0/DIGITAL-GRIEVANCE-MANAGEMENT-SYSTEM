"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUserWithRole } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeGrievanceWithGemini } from "@/lib/ai/gemini-analyzer";
import { z } from "zod";

const createGrievanceSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  category: z.string().min(2, "Category is required"),
  description: z.string().min(15, "Please provide at least 15 characters of detail"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  coarseAddress: z.string().min(3, "Location description or address is required"),
  imagePath: z.string().min(3, "Before image is required"),
});

export async function createGrievance(prevState: any, formData: FormData) {
  const user = await getCurrentUserWithRole();
  if (!user) {
    return { error: "Authentication required to file a grievance." };
  }

  const rawData = {
    title: formData.get("title") as string,
    category: formData.get("category") as string,
    description: formData.get("description") as string,
    latitude: parseFloat(formData.get("latitude") as string),
    longitude: parseFloat(formData.get("longitude") as string),
    coarseAddress: formData.get("coarseAddress") as string,
    imagePath: formData.get("imagePath") as string,
  };

  const validated = createGrievanceSchema.safeParse(rawData);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const adminClient = createAdminClient();

  // Resolve responsible municipal organization synchronously based on reported category
  const getDepartmentType = (catName: string) => {
    const cat = (catName || "").trim().toLowerCase();
    if (
      cat.includes("garbage") ||
      cat.includes("waste") ||
      cat.includes("sanitation") ||
      cat.includes("clean") ||
      cat.includes("debris")
    ) {
      return "SANITATION";
    }
    if (
      cat.includes("light") ||
      cat.includes("electric") ||
      cat.includes("power") ||
      cat.includes("wire") ||
      cat.includes("lamp")
    ) {
      return "ELECTRICITY_BOARD";
    }
    if (
      cat.includes("water") ||
      cat.includes("drain") ||
      cat.includes("sewer") ||
      cat.includes("pipe") ||
      cat.includes("leak")
    ) {
      return "WATER_BOARD";
    }
    if (
      cat.includes("road") ||
      cat.includes("pothole") ||
      cat.includes("pavement") ||
      cat.includes("footpath") ||
      cat.includes("infra")
    ) {
      return "PUBLIC_WORKS";
    }
    if (
      cat.includes("traffic") ||
      cat.includes("signal") ||
      cat.includes("transport")
    ) {
      return "TRANSPORT_AUTHORITY";
    }
    return "MUNICIPALITY";
  };

  const targetDept = getDepartmentType(validated.data.category);
  const { data: matchedOrgs } = await adminClient
    .from("organizations")
    .select("id, name, type")
    .eq("type", targetDept)
    .eq("status", "VERIFIED")
    .limit(1);

  let assignedOrgId = matchedOrgs?.[0]?.id || null;
  let assignedOrgName = matchedOrgs?.[0]?.name || null;

  if (!assignedOrgId) {
    const { data: fallbackOrgs } = await adminClient
      .from("organizations")
      .select("id, name")
      .eq("status", "VERIFIED")
      .limit(1);
    assignedOrgId = fallbackOrgs?.[0]?.id || null;
    assignedOrgName = fallbackOrgs?.[0]?.name || null;
  }

  // 1. Insert grievance with PENDING status and assigned organization
  const { data: grievance, error: grievanceError } = await adminClient
    .from("grievances")
    .insert({
      citizen_id: user.id,
      title: validated.data.title,
      category: validated.data.category,
      description: validated.data.description,
      latitude: validated.data.latitude,
      longitude: validated.data.longitude,
      coarse_address: validated.data.coarseAddress,
      status: "PENDING",
      priority: "MEDIUM",
      assigned_org_id: assignedOrgId,
    })
    .select("id, public_id")
    .single();

  if (grievanceError || !grievance) {
    return { error: grievanceError?.message || "Failed to record grievance." };
  }

  // 2. Insert grievance image record
  await adminClient.from("grievance_images").insert({
    grievance_id: grievance.id,
    storage_path: validated.data.imagePath,
    is_before: true,
  });

  // 3. Write initial status history record
  await adminClient.from("grievance_status_history").insert({
    grievance_id: grievance.id,
    from_status: null,
    to_status: "PENDING",
    changed_by: user.id,
    notes: assignedOrgName
      ? `Citizen filed grievance with GPS & photo evidence. Routed to ${assignedOrgName}.`
      : "Citizen filed grievance with verified GPS coordinates and photo evidence.",
  });

  // 4. Write audit log entry
  await adminClient.from("audit_logs").insert({
    actor_id: user.id,
    actor_role: user.role,
    action: "GRIEVANCE_CREATED",
    resource_type: "grievances",
    resource_id: grievance.id,
    details: {
      public_id: grievance.public_id,
      category: validated.data.category,
      coarse_address: validated.data.coarseAddress,
      assigned_org_id: assignedOrgId,
      assigned_org_name: assignedOrgName,
      lat: validated.data.latitude,
      lng: validated.data.longitude,
    },
  });

  // 5. Send initial notification to citizen
  await adminClient.from("notifications").insert({
    recipient_id: user.id,
    grievance_id: grievance.id,
    title: `Grievance Registered (${grievance.public_id})`,
    message: assignedOrgName
      ? `Your grievance "${validated.data.title}" is logged and assigned to ${assignedOrgName} for dispatch.`
      : `Your grievance "${validated.data.title}" is logged and is undergoing AI triage and organization routing.`,
  });

  // 6. Notify organization staff and department technicians
  if (assignedOrgId) {
    const { data: orgMembers } = await adminClient
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", assignedOrgId);

    if (orgMembers && orgMembers.length > 0) {
      const orgNotifs = orgMembers.map((m) => ({
        recipient_id: m.user_id,
        grievance_id: grievance.id,
        title: `New Dispatch Intake (${grievance.public_id})`,
        message: `New verified report: "${validated.data.title}" in ${validated.data.category} at ${validated.data.coarseAddress}. Ready for technician dispatch.`,
      }));
      await adminClient.from("notifications").insert(orgNotifs);
    }

    const { data: deptWorkers } = await adminClient
      .from("workers")
      .select("user_id")
      .eq("organization_id", assignedOrgId)
      .eq("is_active", true);

    if (deptWorkers && deptWorkers.length > 0) {
      const workerNotifs = deptWorkers.map((w) => ({
        recipient_id: w.user_id,
        grievance_id: grievance.id,
        title: `New Dispatch Order (${grievance.public_id})`,
        message: `New ${validated.data.category} repair order available in your department queue: "${validated.data.title}".`,
      }));
      await adminClient.from("notifications").insert(workerNotifs);
    }
  }

  // 7. Trigger server-side AI triage asynchronously (non-blocking)
  analyzeGrievanceWithGemini(
    grievance.id,
    validated.data.title,
    validated.data.category,
    validated.data.description,
    validated.data.imagePath
  ).catch((err) => {
    console.error("Async AI analysis background error:", err);
  });

  revalidatePath("/citizen");
  revalidatePath("/org");
  revalidatePath("/worker");
  revalidatePath("/org/workers");
  redirect(`/citizen/grievances/${grievance.id}`);
}

export async function uploadGrievancePhoto(
  formData: FormData
): Promise<{ filePath?: string; error?: string }> {
  const user = await getCurrentUserWithRole();
  if (!user) {
    return { error: "Authentication required to upload photos." };
  }

  const file = formData.get("file") as File;
  if (!file) {
    return { error: "No image file provided." };
  }

  if (file.size > 100 * 1024 * 1024) {
    return { error: "Image file exceeds 100MB limit." };
  }

  const fileExt = file.name?.split(".").pop() || "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `citizen-reports/${user.id}/${fileName}`;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const adminClient = createAdminClient();
    const { error: uploadError } = await adminClient.storage
      .from("grievance-images")
      .upload(filePath, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.warn("Storage admin upload error:", uploadError);
      return { error: uploadError.message };
    }

    return { filePath };
  } catch (err: any) {
    return { error: err.message || "Failed to process photo upload." };
  }
}

export async function reverseGeocodeLocation(lat: number, lng: number) {
  const { reverseGeocodeCoordinates } = await import("@/lib/geo/reverse-geocode");
  return await reverseGeocodeCoordinates(lat, lng);
}
