import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { user_id, skill, question_type } = await req.json();
    if (!user_id || !skill || !question_type) {
      return new Response(
        JSON.stringify({ error: "user_id, skill, and question_type are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1) Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("exam_type, level, target_score")
      .eq("user_id", user_id)
      .single();

    // 2) Fetch last 30 seen topics for this skill+type
    const { data: seenTopics } = await supabase
      .from("seen_topics")
      .select("topic")
      .eq("user_id", user_id)
      .eq("skill", skill)
      .eq("question_type", question_type)
      .order("created_at", { ascending: false })
      .limit(30);

    const seenList = (seenTopics || []).map((t: any) => t.topic);

    // 3) Fetch average score per skill from user_attempts
    const { data: attempts } = await supabase
      .from("user_attempts")
      .select("ai_score, question_id")
      .eq("user_id", user_id)
      .not("ai_score", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);

    const avgScore =
      attempts && attempts.length > 0
        ? Math.round(
            attempts.reduce((sum: number, a: any) => sum + (a.ai_score || 0), 0) /
              attempts.length
          )
        : null;

    // 4) Call Lovable AI to generate a fresh question
    const systemPrompt = `You are a PTE Academic question generator. Generate unique, exam-realistic questions. Never repeat topics the student has already seen. Return structured data via the tool call.`;

    const userPrompt = `Generate a fresh ${question_type} question for the ${skill} section of PTE Academic.

Student profile:
- Exam type: ${profile?.exam_type || "PTE Academic"}
- Level: ${profile?.level || "intermediate"}
- Target score: ${profile?.target_score || 65}
- Recent average score: ${avgScore !== null ? avgScore + "/90" : "no attempts yet"}

${seenList.length > 0 ? `Topics already seen (DO NOT repeat any of these):\n${seenList.map((t: string) => `- ${t}`).join("\n")}` : "No topics seen yet."}

Requirements:
- The topic must be academic (science, history, sociology, technology, environment, health, economics, psychology, education, etc.)
- Difficulty should adapt: if avg score > 70, make it harder (difficulty 4-5). If < 40, make it easier (difficulty 1-2). Otherwise difficulty 3.
- For "Read Aloud": generate a 60-80 word academic passage
- For "Repeat Sentence": generate a single 8-12 word sentence
- For "Describe Image": generate a text description of data/chart the student should describe verbally
- For "Summarise Written Text" (writing): generate a 150-200 word academic passage
- For "Write Essay": generate an essay prompt/question`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_question",
                description: "Return the generated question",
                parameters: {
                  type: "object",
                  properties: {
                    question_text: {
                      type: "string",
                      description: "The question text or passage",
                    },
                    topic: {
                      type: "string",
                      description:
                        "Short topic label (2-4 words) e.g. 'coral reef bleaching'",
                    },
                    difficulty: {
                      type: "number",
                      description: "Difficulty 1-5",
                    },
                  },
                  required: ["question_text", "topic", "difficulty"],
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "return_question" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI question generation failed");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const generated = JSON.parse(toolCall.function.arguments);

    // 5) Save topic to seen_topics
    await supabase.from("seen_topics").insert({
      user_id,
      skill,
      question_type,
      topic: generated.topic,
    });

    // Return the question in the same shape as the questions table
    const question = {
      id: crypto.randomUUID(),
      question_text: generated.question_text,
      question_type,
      difficulty: generated.difficulty,
      image_url: null,
      skill,
      exam_type: profile?.exam_type || "PTE Academic",
      is_generated: true,
    };

    return new Response(JSON.stringify(question), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-question error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
