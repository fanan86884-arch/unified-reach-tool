// Runtime-safe backend client.
// This file exists to prevent blank screens when VITE_* env injection is missing in preview.
// It keeps the same exported API as the generated client.ts: `export const supabase = ...`.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Publishable values (safe for client-side usage).
const FALLBACK_URL = "https://xlowcsumezdzgjvjcvln.supabase.co";
const FALLBACK_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsb3djc3VtZXpkemdqdmpjdmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NjU0OTcsImV4cCI6MjA4MjQ0MTQ5N30.6Cu9NxG4I2C0G4NEZO5ag6mzuknD_Y6VGZSEAbKlLRI";

const env = (import.meta as any)?.env ?? {};

const SUPABASE_URL: string = env.VITE_SUPABASE_URL || FALLBACK_URL;
const SUPABASE_PUBLISHABLE_KEY: string =
  env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
