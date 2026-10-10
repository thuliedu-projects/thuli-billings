import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { empty, json } from "../_shared/cors.ts";
import { toE164 } from "../_shared/phone.ts";
import { createOrder, razorpayKeys } from "../_shared/razorpay.ts";
import { adminClient, requireUser } from "../_shared/supabase.ts";

const PLAN_CODES = new Set(["starter", "growth", "pro"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return empty(204);
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  let planCode = "";
  try {
    const body = await req.json();
    planCode = typeof body?.planCode === "string" ? body.planCode : "";
  } catch {
    return json(400, { error: "Choose a plan before paying." });
  }

  if (!PLAN_CODES.has(planCode)) {
    return json(400, { error: "Choose a plan before paying." });
  }

  const phone = toE164(auth.user.phone);
  if (!phone) {
    return json(400, { error: "Sign in with your mobile number before paying." });
  }

  const keys = razorpayKeys();
  if (!keys) {
    return json(503, {
      error: "Razorpay is not connected yet. Payment will open here as soon as it is.",
    });
  }

  const admin = adminClient();
  const { data: plan, error: planError } = await admin
    .from("plans")
    .select("code, name, price_paise, is_active")
    .eq("code", planCode)
    .eq("is_active", true)
    .maybeSingle();

  if (planError || !plan) {
    return json(400, { error: "That plan is not available." });
  }
  if (plan.price_paise < 100) {
    return json(409, { error: "This plan does not have a price yet." });
  }

  try {
    const order = await createOrder({
      keyId: keys.keyId,
      keySecret: keys.keySecret,
      amount: plan.price_paise,
      receipt: `tb${Date.now()}`.slice(0, 40),
      notes: {
        user_id: auth.user.id,
        plan_code: plan.code,
        phone,
      },
    });

    return json(200, {
      keyId: keys.keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planName: plan.name,
      phone,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start payment";
    console.error(`create-razorpay-order failed: ${message}`);
    return json(502, { error: message });
  }
});
