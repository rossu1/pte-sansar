import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("score-speaking");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { audioPath, questionText, questionType, userId } = await req.json();

    // Rate limit: 10 requests per minute per user for AI scoring
    const rateLimitKey = userId || "anon";
    if (!checkRateLimit(`score-speak:${rateLimitKey}`, 10)) {
      log.warn("rate_limited", { user_id: rateLimitKey });
      return rateLimitResponse(corsHeaders);
    }

    log.info("request_received", { details: { questionType } });
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

    // Step 1: Transcribe audio using ElevenLabs STT
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    let transcription = "";

    if (ELEVENLABS_API_KEY) {
      try {
        const sttFormData = new FormData();
        sttFormData.append("file", new File([audioData], "recording.webm", { type: "audio/webm" }));
        sttFormData.append("model_id", "scribe_v2");
        sttFormData.append("language_code", "eng");

        const sttResponse = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
          method: "POST",
          headers: { "xi-api-key": ELEVENLABS_API_KEY },
          body: sttFormData,
        });

        if (sttResponse.ok) {
          const sttData = await sttResponse.json();
          transcription = sttData.text || "";
          log.info("transcription_complete", { details: { length: transcription.length } });
        } else {
          console.error("STT error:", sttResponse.status, await sttResponse.text());
        }
      } catch (sttErr) {
        console.error("STT failed:", sttErr);
      }
    }

    // If transcription is empty, score as silent
    if (!transcription.trim()) {
      const silentResult = {
        overall_score: 0, content_score: 0, fluency_score: 0, pronunciation_score: 0,
        feedback_en: "No speech detected in your recording. Please speak clearly into the microphone.",
        feedback_np: "तपाईंको रेकर्डिङमा कुनै बोली फेला परेन। कृपया माइक्रोफोनमा स्पष्ट बोल्नुहोस्।",
        ideal_answer: questionText,
      };
      return new Response(JSON.stringify(silentResult), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Score the transcription using AI
    const prompt = `You are a PTE Academic speaking examiner. The student was given a "${questionType}" task with this text:

"${questionText}"

The student's spoken response was transcribed as:
"${transcription}"

CRITICAL EVALUATION RULES:
- Compare the transcription carefully against the original text.
- If words are missing, substituted, or added, content_score should reflect that.
- If the transcription shows hesitations, repetitions, or broken phrases, fluency_score should be lower.
- Pronunciation cannot be fully assessed from text alone, so give a moderate score (40-60) unless clear mispronunciations are evident in the transcription.
- Be strict and realistic — this is exam preparation, not encouragement.

Evaluate based on:
1. Content: Did they say ALL the words correctly? Any omissions or substitutions?
2. Fluency: Does the transcription suggest smooth, natural speech? Any repetitions or hesitations?
3. Pronunciation: Based on transcription accuracy, estimate pronunciation quality.`;

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
            content: "You are a strict PTE Academic speaking examiner. Score based on the transcription of the student's speech. Always return valid JSON via the tool call.",
          },
          {
            role: "user",
            content: prompt,
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
