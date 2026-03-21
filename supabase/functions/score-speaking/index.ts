import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { audioPath, questionText, questionType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // For now, since we don't have AssemblyAI configured, we'll use AI to generate
    // a mock score based on the question. In production, you'd transcribe audio first.
    const prompt = `You are a PTE Academic speaking examiner. A student was given a "${questionType}" task with this text:

"${questionText}"

The student recorded their spoken answer. Since I cannot provide the audio transcription right now, please generate a realistic practice score and feedback as if the student performed at an intermediate level (sometimes good, sometimes needs improvement).

Return a JSON object with these exact fields:
- overall_score: number between 40-75 (PTE scale 0-90)
- content_score: number between 40-80
- fluency_score: number between 35-75
- pronunciation_score: number between 40-70
- feedback_en: 2-3 sentences of constructive English feedback about speaking performance
- feedback_np: the same feedback translated to Nepali
- ideal_answer: a brief description of what an ideal spoken answer would sound like for this text`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a PTE Academic speaking examiner. Always return valid JSON only, no markdown." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_score",
            description: "Return the speaking score result",
            parameters: {
              type: "object",
              properties: {
                overall_score: { type: "number" },
                content_score: { type: "number" },
                fluency_score: { type: "number" },
                pronunciation_score: { type: "number" },
                feedback_en: { type: "string" },
                feedback_np: { type: "string" },
                ideal_answer: { type: "string" },
              },
              required: ["overall_score", "content_score", "fluency_score", "pronunciation_score", "feedback_en", "feedback_np", "ideal_answer"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_score" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI scoring failed");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("score-speaking error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
