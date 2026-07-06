// Ambient declaration for MCP tool files. Tools are bundled by
// @lovable.dev/mcp-js into a Deno Edge Function where `process.env` is
// available; this declaration keeps the Vite/TS checker happy.
declare const process: { env: Record<string, string | undefined> };
