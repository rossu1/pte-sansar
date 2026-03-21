import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Download the actual audio file from storage
    const { data: audioData, error: downloadError } = await supabase.storage
      .from("speaking-recordings")
      .download(audioPath);

    if (downloadError || !audioData) {
      console.error("Download error:", downloadError);
      throw new Error("Failed to download audio recording");
    }

    // Convert audio blob to base64
    const arrayBuffer = await audioData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const audioBase64 = btoa(binary);

    const prompt = `You are a PTE Academic speaking examiner. The student was given a "${questionType}" task with this text:

"${questionText}"

I am providing the student's actual audio recording. Please listen carefully and evaluate their speaking performance.

CRITICAL EVALUATION RULES:
- If the audio is SILENT (no speech detected), all scores MUST be 0 and feedback must say "No speech detected."
- If the audio contains speech that does NOT match the given text, content_score must be very low (0-20).
- If words are mispronounced, pronunciation_score should reflect that accurately.
- If speech is hesitant or broken, fluency_score should reflect that.
- Be strict and realistic — this is exam preparation, not encouragement.

Evaluate based on:
1. Content: Did they read ALL the words correctly? Any omissions or substitutions?
2. Fluency: Was the speech smooth and natural? Any long pauses, repetitions, or hesitations?
3. Pronunciation: Were words pronounced clearly and correctly? Stress and intonation?`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a strict PTE Academic speaking examiner. You MUST listen to the audio and score based on what you actually hear. Silent audio = zero scores. Always return valid JSON via the tool call.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:audio/webm;base64,${audioBase64}`,
                },
              },
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_score",
            description: "Return the speaking score result based on actual audio analysis",
            parameters: {
              type: "object",
              properties: {
                overall_score: { type: "number", description: "Overall score 0-90. 0 if no speech detected." },
                content_score: { type: "number", description: "Content accuracy 0-90. 0 if no speech." },
                fluency_score: { type: "number", description: "Fluency score 0-90. 0 if no speech." },
                pronunciation_score: { type: "number", description: "Pronunciation score 0-90. 0 if no speech." },
                feedback_en: { type: "string", description: "Detailed feedback in English about what was actually heard" },
                feedback_np: { type: "string", description: "Same feedback translated to Nepali" },
                ideal_answer: { type: "string", description: "Description of ideal spoken performance for this text" },
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
