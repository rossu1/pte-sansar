import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_answer, question_text, question_type, correct_answer, skill } = await req.json();
    if (!question_text || !question_type) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are a PTE Academic ${skill || "reading/listening"} examiner.

Question type: "${question_type}"
Skill: "${skill}"

Question/Passage:
"${question_text}"

${correct_answer ? `Correct answer: "${correct_answer}"` : ""}

Student's answer: "${user_answer || "(no answer)"}"

TASK-SPECIFIC RULES:
- Multiple Choice: Check if selected option(s) match the correct answer(s). Score based on correct selections.
- Reorder Paragraphs: Check ordering accuracy. Each correct adjacent pair scores points.
- Fill in Blanks (Reading & Listening): Check each blank. Award partial credit for partially correct answers.
- Summarise Spoken Text: Evaluate like writing (content, grammar, vocab) but content must reflect what was spoken.
- Highlight Correct Summary: Binary correct/incorrect.

Be strict. This is exam preparation.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a strict PTE Academic examiner. Return structured scores via the tool call." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_score",
            description: "Return the evaluation scores",
            parameters: {
              type: "object",
              properties: {
                overall_score: { type: "number", description: "Overall score 0-90" },
                is_correct: { type: "boolean", description: "Whether the answer is correct (for MCQ/highlight)" },
                partial_score: { type: "number", description: "Partial credit score 0-90 for fill-in-blanks or reorder" },
                feedback_en: { type: "string", description: "Detailed feedback in English" },
                feedback_np: { type: "string", description: "Same feedback in Nepali" },
                correct_answer_explanation: { type: "string", description: "Explanation of the correct answer" },
              },
              required: ["overall_score", "is_correct", "feedback_en", "feedback_np", "correct_answer_explanation"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_score" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited." }), {
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
    console.error("score-rl error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
