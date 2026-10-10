import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { json } from "../_shared/cors.ts";
import { toE164 } from "../_shared/phone.ts";
import {
  fetchPayment,
  razorpayKeys,
  signaturesMatch,
  webhookSecret,
  webhookSignature,
} from "../_shared/razorpay.ts";
import { adminClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const secret = webhookSecret();
  const keys = razorpayKeys();
  if (!secret || !keys) {
    return json(503, { error: "Razorpay webhook is not configured." });
  }

  const payload = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!signature || !signaturesMatch(signature, webhookSignature(payload, secret))) {
    return json(401, { error: "Invalid webhook signature" });
  }

  let eventName = "";
  let paymentId = "";
  try {
    const event = JSON.parse(payload) as {
      event?: string;
      payload?: { payment?: { entity?: { id?: string } } };
    };
    eventName = event.event ?? "";
    paymentId = event.payload?.payment?.entity?.id ?? "";
  } catch {
    return json(400, { error: "Invalid webhook payload" });
  }

  if (eventName !== "payment.captured") {
    return json(200, { ignored: true });
  }
  if (!paymentId) {
    console.error("razorpay webhook missing payment id");
    return json(200, { ignored: true });
  }

  try {
    const payment = await fetchPayment(keys.keyId, keys.keySecret, paymentId);
    if (payment.status !== "captured" || payment.currency !== "INR") {
      return json(200, { ignored: true });
    }

    const phone = toE164(payment.notes.phone);
    const userId = payment.notes.user_id ?? "";
    const planCode = payment.notes.plan_code ?? "";
    if (!phone || !userId || !planCode) {
      console.error("razorpay webhook payment is missing checkout notes");
      return json(200, { ignored: true });
    }

    const admin = adminClient();
    const { error } = await admin.rpc("record_captured_payment", {
      p_user_id: userId,
      p_plan_code: planCode,
      p_payment_id: payment.id,
      p_order_id: payment.order_id,
      p_amount_paise: payment.amount,
      p_owner_phone: phone,
    });

    if (error) {
      console.error(`razorpay webhook record failed: ${error.message}`);
      return json(500, { error: "Could not record payment" });
    }

    return json(200, { ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "webhook failed";
    console.error(`razorpay webhook failed: ${message}`);
    return json(500, { error: "Could not record payment" });
  }
});
