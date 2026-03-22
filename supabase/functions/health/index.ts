import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const checks: Record<string, string> = {};
  let status = "ok";

  // Check required env vars
  const requiredVars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "LOVABLE_API_KEY"];
  for (const v of requiredVars) {
    if (!Deno.env.get(v)) {
      checks[v] = "missing";
      status = "error";
    } else {
      checks[v] = "present";
    }
  }

  // Check DB connectivity
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { error } = await supabase.from("profiles").select("id").limit(1);
    checks.db = error ? `error: ${error.message}` : "connected";
    if (error) status = "degraded";
  } catch (e) {
    checks.db = "unreachable";
    status = "error";
  }

  const httpStatus = status === "ok" ? 200 : status === "degraded" ? 200 : 500;

  return new Response(
    JSON.stringify({ status, checks, timestamp: new Date().toISOString() }),
    { status: httpStatus, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
