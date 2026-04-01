#!/usr/bin/env node
/**
 * Award the "creator" badge to beta users.
 *
 * Usage:
 *   node --env-file=.env scripts/award-creator-badge.js --username alix
 *   node --env-file=.env scripts/award-creator-badge.js --username alix --dry-run
 *   node --env-file=.env scripts/award-creator-badge.js --email alix@example.com
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
 */

import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const usernameIdx = args.indexOf("--username");
const emailIdx = args.indexOf("--email");

const username = usernameIdx !== -1 ? args[usernameIdx + 1] : null;
const email = emailIdx !== -1 ? args[emailIdx + 1] : null;

if (!username && !email) {
  console.error("Usage: --username <pseudo> or --email <email> [--dry-run]");
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function findUser() {
  if (username) {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, display_name")
      .ilike("username", username)
      .limit(1)
      .single();
    if (error) { console.error("User not found:", username); process.exit(1); }
    return data;
  }
  // Find by auth email
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) { console.error("Auth error:", error.message); process.exit(1); }
  const authUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (!authUser) { console.error("Auth user not found:", email); process.exit(1); }
  const { data } = await supabase.from("users").select("id, username, display_name").eq("id", authUser.id).single();
  if (!data) { console.error("Profile not found for auth user:", authUser.id); process.exit(1); }
  return data;
}

const user = await findUser();
console.log(`User: @${user.username} (${user.display_name || "—"}) — ${user.id}`);

// Check if already awarded
const { data: existing } = await supabase
  .from("user_badges")
  .select("id")
  .eq("user_id", user.id)
  .eq("badge_id", "creator")
  .limit(1)
  .maybeSingle();

if (existing) {
  console.log("Already has creator badge. Nothing to do.");
  process.exit(0);
}

if (dryRun) {
  console.log("[DRY RUN] Would award creator badge to @" + user.username);
  process.exit(0);
}

const { error: insertErr } = await supabase.from("user_badges").insert({
  user_id: user.id,
  badge_id: "creator",
});

if (insertErr) {
  console.error("Insert error:", insertErr.message);
  process.exit(1);
}

console.log("Creator badge awarded to @" + user.username);
