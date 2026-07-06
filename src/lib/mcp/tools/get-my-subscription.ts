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
  name: "get_my_subscription",
  title: "Get my subscription",
  description:
    "Fetch the signed-in client's active subscription (type, start/end date, days remaining, paid/remaining amount, captain).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: account, error: accErr } = await supabase
      .from("client_accounts")
      .select("subscriber_id")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (accErr || !account) {
      return {
        content: [{ type: "text", text: "No client account linked to this user." }],
        isError: true,
      };
    }
    const { data: sub, error } = await supabase
      .from("subscribers")
      .select("*")
      .eq("id", account.subscriber_id)
      .maybeSingle();
    if (error || !sub) {
      return { content: [{ type: "text", text: error?.message ?? "Not found" }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(sub) }],
      structuredContent: { subscription: sub },
    };
  },
});
