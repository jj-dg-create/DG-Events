import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://eswcudkptloxexjzecpe.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("CHECKOUTPAGE_WEBHOOK_SECRET") || "";

async function verifySignature(
  body: string,
  signature: string | null,
): Promise<boolean> {
  if (!WEBHOOK_SECRET || !signature) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expected === signature;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();

  // Validate HMAC signature
  const signature = req.headers.get("x-checkoutpage-signature");
  if (WEBHOOK_SECRET) {
    const valid = await verifySignature(rawBody, signature);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Only process conversion events with paid/free status
  if (payload.event !== "conversion") {
    return new Response(
      JSON.stringify({ message: "Event type ignored", event: payload.event }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const data = payload.data;
  if (!data) {
    return new Response(JSON.stringify({ error: "Missing data" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const status = data.status;
  if (status !== "paid" && status !== "free") {
    return new Response(
      JSON.stringify({ message: "Status ignored", status }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Look up event mapping by checkoutId (the page ID)
  const checkoutId = data.checkoutId;
  if (!checkoutId) {
    return new Response(
      JSON.stringify({ error: "Missing checkoutId" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { data: mapping } = await supabase
    .from("checkout_mappings")
    .select("event_id")
    .eq("checkoutpage_page_id", checkoutId)
    .single();

  if (!mapping) {
    return new Response(
      JSON.stringify({ message: "No mapping configured for this page" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const eventId = mapping.event_id;

  // Split name on first space
  const fullName = (data.customerName || "").trim();
  const spaceIdx = fullName.indexOf(" ");
  const firstName = spaceIdx > 0 ? fullName.slice(0, spaceIdx) : fullName;
  const lastName = spaceIdx > 0 ? fullName.slice(spaceIdx + 1) : "";

  const email = (data.customerEmail || "").trim().toLowerCase();

  // Check for duplicate by email
  if (email) {
    const { data: existing } = await supabase
      .from("attendees")
      .select("id")
      .eq("event_id", eventId)
      .eq("email", email)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ message: "Duplicate skipped", email }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // Fuzzy match badge type from selectedOption
  let badgeTypeId: string | null = null;
  const selectedOption =
    data.variants?.all?.selectedOption ||
    data.variants?.selectedOption ||
    "";

  if (selectedOption) {
    const { data: badgeTypes } = await supabase
      .from("badge_types")
      .select("id, display_name")
      .eq("event_id", eventId);

    if (badgeTypes) {
      const optLower = selectedOption.toLowerCase().trim();
      const match = badgeTypes.find(
        (bt: any) =>
          bt.display_name.toLowerCase().includes(optLower) ||
          optLower.includes(bt.display_name.toLowerCase()),
      );
      if (match) badgeTypeId = match.id;
    }
  }

  // Insert attendee
  const { error: insertError } = await supabase.from("attendees").insert({
    event_id: eventId,
    first_name: firstName || "Guest",
    last_name: lastName,
    email: email || null,
    badge_type_id: badgeTypeId,
    checked_in: false,
    is_walkup: false,
  });

  if (insertError) {
    return new Response(
      JSON.stringify({ error: "Insert failed", detail: insertError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      message: "Attendee created",
      name: `${firstName} ${lastName}`.trim(),
      email,
      badgeTypeId,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
