import { GoogleGenerativeAI } from "@google/generative-ai";
import { createAdminClient } from "@/lib/supabase/admin";

export async function analyzeGrievanceWithGemini(
  grievanceId: string,
  title: string,
  category: string,
  description: string,
  imagePath: string
) {
  const adminClient = createAdminClient();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set. Marking AI triage as failed/pending.");
    await adminClient.from("ai_analyses").insert({
      grievance_id: grievanceId,
      status: "FAILED",
      summary: "AI API key missing in environment.",
    });
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const MODEL_CANDIDATES = ["gemini-3.5-flash", "gemini-3.8-flash"];
    let responseText = "";
    let lastError: any = null;

    for (const modelName of MODEL_CANDIDATES) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
          },
        });
        const prompt = `You are the lead AI Civic Triage Officer for ResolveAI, a digital grievance management platform.
Analyze the following citizen-reported problem and produce a structured advisory evaluation in JSON.

Citizen Title: "${title}"
Reported Category: "${category}"
Detailed Description: "${description}"

Return a valid JSON object matching this exact schema:
{
  "suggested_category": "string (refined department category)",
  "suggested_priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "suggested_department": "MUNICIPALITY" | "PUBLIC_WORKS" | "WATER_BOARD" | "ELECTRICITY_BOARD" | "TRANSPORT_AUTHORITY" | "SANITATION" | "OTHER",
  "summary": "string (1-2 clear sentences summarizing the core issue)",
  "severity_score": number (integer between 1 and 10),
  "duplicate_score": number (float between 0.0 and 1.0 indicating likelihood of duplicate),
  "reasoning": "string"
}`;
        const result = await model.generateContent(prompt);
        responseText = result.response.text();
        if (responseText) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!responseText) {
      throw lastError || new Error("All Gemini model candidates failed.");
    }

    const parsed = JSON.parse(responseText);

    // 1. Store structured analysis in ai_analyses
    await adminClient.from("ai_analyses").insert({
      grievance_id: grievanceId,
      suggested_category: parsed.suggested_category || category,
      suggested_priority: parsed.suggested_priority || "MEDIUM",
      suggested_department: parsed.suggested_department || "MUNICIPALITY",
      summary: parsed.summary || title,
      severity_score: Number(parsed.severity_score) || 5,
      duplicate_score: Number(parsed.duplicate_score) || 0.0,
      raw_response: parsed,
      status: "COMPLETED",
    });

    // 2. Update grievance priority based on AI recommendation
    if (parsed.suggested_priority) {
      await adminClient
        .from("grievances")
        .update({ priority: parsed.suggested_priority })
        .eq("id", grievanceId);
    }

    // 3. Automated routing: find a verified organization matching suggested_department
    const { data: matchingOrgs } = await adminClient
      .from("organizations")
      .select("id, name")
      .eq("type", parsed.suggested_department)
      .eq("status", "VERIFIED")
      .limit(1);

    if (matchingOrgs && matchingOrgs.length > 0) {
      const targetOrg = matchingOrgs[0];
      await adminClient
        .from("grievances")
        .update({ assigned_org_id: targetOrg.id })
        .eq("id", grievanceId);

      // Audit log the automated routing
      await adminClient.from("audit_logs").insert({
        actor_id: null,
        actor_role: "PLATFORM_ADMIN",
        action: "AI_ROUTED_TO_ORGANIZATION",
        resource_type: "grievances",
        resource_id: grievanceId,
        details: {
          org_id: targetOrg.id,
          org_name: targetOrg.name,
          department_type: parsed.suggested_department,
          ai_confidence: 0.95,
        },
      });
    }

    console.log(`AI Triage completed for grievance ${grievanceId}`);
  } catch (error: any) {
    console.error("Gemini triage error:", error);
    // Non-negotiable rule: AI failure must not lose the grievance; mark analysis as failed/retryable
    await adminClient.from("ai_analyses").insert({
      grievance_id: grievanceId,
      status: "FAILED",
      summary: `AI triage failed: ${error?.message || "Unknown error"}`,
      raw_response: { error: String(error) },
    });
  }
}
