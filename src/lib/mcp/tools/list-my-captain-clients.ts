import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_my_captain_clients",
  title: "List captain clients",
  description:
    "If the signed-in user is a captain, list the subscribers assigned to them.",
  inputSchema: {
    search: z.string().describe("Optional name substring to filter by.").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: cap } = await supabase
      .from("captain_accounts")
      .select("captain_name")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (!cap) {
      return {
        content: [{ type: "text", text: "This user is not linked to a captain account." }],
        isError: true,
      };
    }
    let q = supabase.from("subscribers").select("*").eq("captain", cap.captain_name);
    if (search && search.trim()) q = q.ilike("name", `%${search.trim()}%`);
    const { data, error } = await q.limit(200);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { clients: data ?? [] },
    };
  },
});
