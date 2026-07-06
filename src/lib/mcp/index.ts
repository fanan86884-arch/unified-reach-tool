import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMySubscription from "./tools/get-my-subscription";
import listMyNotifications from "./tools/list-my-notifications";
import listMyCaptainClients from "./tools/list-my-captain-clients";

// The OAuth issuer must be the direct Supabase host, built from the project ref
// (never the .lovable.cloud proxy URL). VITE_SUPABASE_PROJECT_ID is inlined at
// build time so this stays import-safe.
const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "gym-mcp",
  title: "2B Gym MCP",
  version: "0.1.0",
  instructions:
    "Tools for the 2B Gym app. Clients can read their own subscription and notifications; captains can list their assigned clients.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMySubscription, listMyNotifications, listMyCaptainClients],
});
