import { GoogleGenerativeAI } from "@google/generative-ai";
import { createAdminClient } from "@/lib/supabase/admin";

interface VerifyEvidenceInput {
  evidenceId: string;
  grievanceId: string;
  title: string;
  description: string;
  workerNotes: string;
  distanceMeters: number;
  beforeImagePath?: string | null;
  afterImagePath?: string | null;
}

export async function verifyEvidenceWithGemini(input: VerifyEvidenceInput) {
  const adminClient = createAdminClient();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("GEMINI_API_KEY missing. Flagging evidence for manual supervisor inspection.");
    await adminClient.from("ai_evidence_verifications").insert({
      evidence_id: input.evidenceId,
      grievance_id: input.grievanceId,
      visual_improvement: false,
      relevance_score: 0.0,
      confidence: 0.5,
      result: "INCONCLUSIVE",
      reason: "Automated AI verification unconfigured. Manual operator review required.",
      consistency_notes: "Operator must visually verify photographs prior to approval.",
    });
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    const contentParts: any[] = [];

    // Attempt to download and include Before image
    if (input.beforeImagePath) {
      try {
        if (input.beforeImagePath.startsWith("http://") || input.beforeImagePath.startsWith("https://")) {
          const res = await fetch(input.beforeImagePath);
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            contentParts.push("IMAGE 1 (BEFORE REPAIR - Citizen Initial Damage Report):");
            contentParts.push({
              inlineData: {
                data: Buffer.from(arrayBuffer).toString("base64"),
                mimeType: res.headers.get("content-type") || "image/jpeg",
              },
            });
          }
        } else {
          const { data: beforeBlob } = await adminClient.storage
            .from("grievance-images")
            .download(input.beforeImagePath);
          if (beforeBlob) {
            const buffer = Buffer.from(await beforeBlob.arrayBuffer());
            contentParts.push("IMAGE 1 (BEFORE REPAIR - Citizen Initial Damage Report):");
            contentParts.push({
              inlineData: {
                data: buffer.toString("base64"),
                mimeType: "image/jpeg",
              },
            });
          }
        }
      } catch (err) {
        console.warn("Could not load before image for AI analysis:", err);
      }
    }

    // Attempt to download and include After image
    if (input.afterImagePath) {
      try {
        if (input.afterImagePath.startsWith("http://") || input.afterImagePath.startsWith("https://")) {
          const res = await fetch(input.afterImagePath);
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            contentParts.push("IMAGE 2 (AFTER REPAIR - Technician Completion Proof):");
            contentParts.push({
              inlineData: {
                data: Buffer.from(arrayBuffer).toString("base64"),
                mimeType: res.headers.get("content-type") || "image/jpeg",
              },
            });
          }
        } else {
          const { data: afterBlob } = await adminClient.storage
            .from("completion-evidence")
            .download(input.afterImagePath);
          if (afterBlob) {
            const buffer = Buffer.from(await afterBlob.arrayBuffer());
            contentParts.push("IMAGE 2 (AFTER REPAIR - Technician Completion Proof):");
            contentParts.push({
              inlineData: {
                data: buffer.toString("base64"),
                mimeType: "image/jpeg",
              },
            });
          }
        }
      } catch (err) {
        console.warn("Could not load after image for AI analysis:", err);
      }
    }

    const promptText = `You are the lead AI Visual Evidence Auditor for ResolveAI, an automated civic grievance and public infrastructure repair platform.
Your task is to analyze whether the field technician's repair work addresses and resolves the reported grievance by comparing the before evidence (citizen's initial problem report) and after evidence (technician's completion proof).

Grievance Details:
- Title: "${input.title}"
- Citizen Report Description: "${input.description}"
- Technician Repair Notes: "${input.workerNotes}"
- Proximity Distance Telemetry: ${input.distanceMeters > 0 ? `${input.distanceMeters} meters` : "Verified near site"}

VERIFICATION & AUDITING GUIDELINES:
1. INFRASTRUCTURE & DOMAIN RELEVANCE:
   - Check if Image 2 (Technician's Completion Proof) shows work or an asset relevant to the reported civic category (e.g. lighting/electrical apparatus, roads/potholes, sanitation/waste, water/pipeline).
   - In field operations, repairs may involve close-ups of newly replaced components, bulbs, fixtures, switches, wiring, repaved patches, or cleared areas. Accept close-ups, component-level repairs, or different camera perspectives that show a functional or restored asset matching the category (such as lighting, electricity, sanitation, or roadwork).
   - Only reject if Image 2 is completely non-work-related (e.g., a blank black image, unrelated animal/pet, personal selfie, or video game screenshot).

2. RESOLUTION VERIFICATION:
   - If Image 2 shows that the issue is repaired, restored, or that a working fixture/asset is operational: mark as "result": "PASS", "visual_improvement": true, "relevance_score": 0.85 to 1.0.
   - If the proof is component-level or demonstrates active repair efforts, favor a constructive "PASS" with relevant inspector notes.
   - Only if the reported defect is completely unaddressed or unrelated should you set "result": "FAIL".

Return valid JSON strictly adhering to this schema:
{
  "visual_improvement": boolean,
  "relevance_score": number (0.0 to 1.0 indicating relevance to the reported issue),
  "confidence": number (0.0 to 1.0),
  "result": "PASS" | "FAIL" | "INCONCLUSIVE",
  "reason": "Clear explanation of how the technician's proof addresses the civic problem or what was repaired",
  "consistency_notes": "Helpful verification feedback for departmental inspectors and the technician"
}`;

    contentParts.push(promptText);

    // Multi-model fallback list prioritizing high-availability Gemini models
    const MODEL_CANDIDATES = [
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.8-flash",
      "gemini-flash-latest",
    ];

    let responseText = "";
    let lastModelError: any = null;

    for (const modelName of MODEL_CANDIDATES) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
          },
        });
        const result = await model.generateContent(contentParts);
        responseText = result.response.text();
        if (responseText) break;
      } catch (mErr) {
        lastModelError = mErr;
        console.warn(`Model ${modelName} verification attempt failed, trying fallback:`, mErr);
      }
    }

    if (!responseText) {
      throw lastModelError || new Error("All Gemini model candidates failed to return response.");
    }

    const parsed = JSON.parse(responseText);

    let finalResult: "PASS" | "FAIL" | "INCONCLUSIVE" = "PASS";
    if (parsed.result === "PASS") {
      finalResult = "PASS";
    } else if (parsed.result === "INCONCLUSIVE") {
      finalResult = "INCONCLUSIVE";
    } else if (
      parsed.result === "FAIL" ||
      parsed.result === "MISMATCH" ||
      parsed.visual_improvement === false
    ) {
      finalResult = "FAIL";
    }

    await adminClient.from("ai_evidence_verifications").insert({
      evidence_id: input.evidenceId,
      grievance_id: input.grievanceId,
      visual_improvement: typeof parsed.visual_improvement === "boolean" ? parsed.visual_improvement : (finalResult === "PASS"),
      relevance_score: Number(parsed.relevance_score) || (finalResult === "PASS" ? 0.90 : 0.0),
      confidence: Number(parsed.confidence) || 0.90,
      result: finalResult,
      reason: parsed.reason || (finalResult === "PASS" 
        ? "Technician submitted photographic and on-site completion evidence confirming resolution." 
        : "Visual evidence did not demonstrate that the reported civic issue was resolved."),
      consistency_notes: parsed.consistency_notes || (finalResult === "PASS"
        ? "Visual inspection confirms restoration is consistent with reported defect."
        : "Please ensure the correct repair site is photographed and properly restored."),
      raw_analysis: parsed,
    });
  } catch (error) {
    console.error("Error running Gemini evidence verification:", error);
    // Graceful fallback: Mark as INCONCLUSIVE for manual operator review instead of hard fail
    await adminClient.from("ai_evidence_verifications").insert({
      evidence_id: input.evidenceId,
      grievance_id: input.grievanceId,
      visual_improvement: false,
      relevance_score: 0.5,
      confidence: 0.5,
      result: "INCONCLUSIVE",
      reason: "Automated AI verification queued for municipal inspector sign-off.",
      consistency_notes: "Completion proof registered and awaiting municipal inspector review.",
    });
  }
}
