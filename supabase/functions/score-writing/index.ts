import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("score-writing");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_answer, question_text, question_type, userId } = await req.json();
    if (!user_answer || !question_text || !question_type) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 10 requests per minute per user
    const rateLimitKey = userId || "anon";
    if (!checkRateLimit(`score-write:${rateLimitKey}`, 10)) {
      log.warn("rate_limited", { user_id: rateLimitKey });
      return rateLimitResponse(corsHeaders);
    }

    log.info("request_received", { details: { question_type } });
    if (!user_answer || !question_text || !question_type) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const taskDescriptions: Record<string, string> = {
      "Summarise Written Text": "The student must write a single sentence summary (5-75 words) of the given passage. Evaluate: content coverage, grammatical accuracy, vocabulary, and sentence structure.",
      "Write Essay": "The student must write a 200-300 word argumentative essay. Evaluate: content relevance, development of ideas, organization, grammar, vocabulary, spelling, and linguistic range.",
    };

    const prompt = `You are a PTE Academic writing examiner. The student was given a "${question_type}" task.

Task description: ${taskDescriptions[question_type] || "Evaluate the writing quality."}

Original text/prompt:
"${question_text}"

Student's answer:
"${user_answer}"

EVALUATION RULES:
- If the answer is empty or nonsensical, all scores MUST be 0.
- For Summarise Written Text: penalize heavily if answer is more than one sentence or exceeds 75 words.
- For Write Essay: penalize if under 200 or over 300 words.
- Be strict and realistic — this is exam preparation.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a strict PTE Academic writing examiner. Always return structured scores via the tool call." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_writing_score",
            description: "Return writing evaluation scores",
            parameters: {
              type: "object",
              properties: {
                overall_score: { type: "number", description: "Overall score 0-90" },
                content_score: { type: "number", description: "Content relevance 0-90" },
                grammar_score: { type: "number", description: "Grammar accuracy 0-90" },
                vocabulary_score: { type: "number", description: "Vocabulary & spelling 0-90" },
                structure_score: { type: "number", description: "Organization & structure 0-90" },
                word_count: { type: "number", description: "Word count of the answer" },
                feedback_en: { type: "string", description: "Detailed feedback in English" },
                feedback_np: { type: "string", description: "Same feedback in Nepali" },
                improved_version: { type: "string", description: "An improved version of the student's answer" },
              },
              required: ["overall_score", "content_score", "grammar_score", "vocabulary_score", "structure_score", "word_count", "feedback_en", "feedback_np", "improved_version"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_writing_score" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
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
    console.error("score-writing error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
