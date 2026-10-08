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
Your task is to analyze whether the field technician's repair work has successfully fixed and resolved the reported damage by comparing the before and after evidence.

Grievance Details:
- Title: "${input.title}"
- Citizen Report Description: "${input.description}"
- Worker Repair Notes: "${input.workerNotes}"
- Verified On-Site GPS Distance from Report: ${input.distanceMeters} meters (Site tolerance is ≤ 100m)

CRITICAL AUDIT & FRAUD DETECTION RULES:
1. SUBJECT RELEVANCE & FRAUD DETECTION (ZERO TOLERANCE):
   - Examine Image 2 (Technician's Completion Proof). Does it depict the exact physical location, infrastructure defect, or public civic asset shown in Image 1 (Citizen Report) and described in the grievance details?
   - If Image 2 depicts an unrelated object (e.g. computer/laptop screen, personal electronics, indoor room, office, car, selfie, animal, meme, or completely different location), you MUST IMMEDIATELY FAIL the verification.
   - For an unrelated or fraudulent image, you MUST set:
     "result": "FAIL",
     "visual_improvement": false,
     "relevance_score": 0.0,
     "confidence": 1.0,
     "reason": "Fraudulent or unrelated completion image detected: Technician submitted an image of [describe what is actually shown in Image 2], which is completely unrelated to the reported civic issue [describe issue].",
     "consistency_notes": "The uploaded completion proof does not correspond to the reported grievance site or damage. Technician must re-photograph the actual restored site."

2. VISUAL RESTORATION VERIFICATION:
   - If Image 2 genuinely shows the reported location/asset, determine if the reported damage (e.g. overfilled dumpster, pothole, water leak, broken streetlight) has been fully cleaned up, repaired, or restored.
   - If work is incomplete, poorly executed, or the defect is still present: set "result": "FAIL", "visual_improvement": false, and explain in "reason".
   - If clearly and satisfactorily resolved: set "result": "PASS", "visual_improvement": true.

Return valid JSON strictly adhering to this schema:
{
  "visual_improvement": boolean,
  "relevance_score": number (0.0 to 1.0 indicating how directly the repair addresses the reported defect, 0.0 if unrelated),
  "confidence": number (0.0 to 1.0),
  "result": "PASS" | "FAIL" | "INCONCLUSIVE",
  "reason": "Clear explanation of whether the repair passed or why it failed, noting specific visual changes, mismatches, or missing fixes",
  "consistency_notes": "Detailed verification feedback and remedial instructions for the technician if not passed"
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
    if (
      parsed.result === "FAIL" ||
      parsed.result === "MISMATCH" ||
      parsed.visual_improvement === false ||
      (typeof parsed.relevance_score === "number" && parsed.relevance_score < 0.6)
    ) {
      finalResult = "FAIL";
    } else if (parsed.result === "INCONCLUSIVE") {
      finalResult = "INCONCLUSIVE";
    }

    await adminClient.from("ai_evidence_verifications").insert({
      evidence_id: input.evidenceId,
      grievance_id: input.grievanceId,
      visual_improvement: typeof parsed.visual_improvement === "boolean" ? parsed.visual_improvement : (finalResult === "PASS"),
      relevance_score: Number(parsed.relevance_score) || (finalResult === "PASS" ? 0.88 : 0.0),
      confidence: Number(parsed.confidence) || 0.85,
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
    // FAIL-SAFE: Never mark unverified or errored evidence as PASS!
    await adminClient.from("ai_evidence_verifications").insert({
      evidence_id: input.evidenceId,
      grievance_id: input.grievanceId,
      visual_improvement: false,
      relevance_score: 0.0,
      confidence: 0.5,
      result: "FAIL",
      reason: "Automated AI verification encountered an inspection error. Manual supervisor inspection required.",
      consistency_notes: "Completion proof could not be verified automatically and requires manual departmental sign-off.",
    });
  }
}
