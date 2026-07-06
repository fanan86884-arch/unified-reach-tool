import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient((globalThis as any).process.env.SUPABASE_URL, (globalThis as any).process.env.SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_my_notifications",
  title: "List my notifications",
  description: "List notifications for the signed-in client (most recent first).",
  inputSchema: {
    limit: z.number().int().positive().describe("Max notifications to return.").optional(),
    unreadOnly: z.boolean().describe("Only return unread notifications.").optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, unreadOnly }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: account } = await supabase
      .from("client_accounts")
      .select("subscriber_id")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (!account) {
      return { content: [{ type: "text", text: "No client account linked." }], isError: true };
    }
    let q = supabase
      .from("client_notifications")
      .select("*")
      .eq("subscriber_id", account.subscriber_id)
      .order("created_at", { ascending: false })
      .limit(Math.min(limit ?? 20, 100));
    if (unreadOnly) q = q.eq("is_read", false);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { notifications: data ?? [] },
    };
  },
});
