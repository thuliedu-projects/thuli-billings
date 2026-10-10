import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { empty, json } from "../_shared/cors.ts";
import { toE164 } from "../_shared/phone.ts";
import {
  fetchPayment,
  paymentSignature,
  razorpayKeys,
  signaturesMatch,
} from "../_shared/razorpay.ts";
import { adminClient, requireUser } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return empty(204);
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await requireUser(req);
  if ("error" in auth) return auth.error;

  let orderId = "";
  let paymentId = "";
  let signature = "";
  try {
    const body = await req.json();
    orderId = typeof body?.razorpay_order_id === "string" ? body.razorpay_order_id : "";
    paymentId = typeof body?.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
    signature = typeof body?.razorpay_signature === "string" ? body.razorpay_signature : "";
  } catch {
    return json(400, { error: "Payment confirmation is incomplete." });
  }

  if (!orderId || !paymentId || !signature) {
    return json(400, { error: "Payment confirmation is incomplete." });
  }

  const keys = razorpayKeys();
  if (!keys) {
    return json(503, { error: "Razorpay is not connected yet." });
  }

  const phone = toE164(auth.user.phone);
  if (!phone) {
    return json(400, { error: "Sign in with your mobile number before paying." });
  }

  try {
    const expected = paymentSignature(orderId, paymentId, keys.keySecret);
    if (!signaturesMatch(signature, expected)) {
      return json(400, { error: "Payment could not be verified." });
    }

    const payment = await fetchPayment(keys.keyId, keys.keySecret, paymentId);
    if (payment.status !== "captured") {
      return json(409, { error: "Payment is not completed yet." });
    }
    if (payment.order_id !== orderId || payment.currency !== "INR") {
      return json(400, { error: "Payment could not be verified." });
    }
    if (payment.notes.user_id !== auth.user.id || payment.notes.phone !== phone) {
      return json(403, { error: "This payment belongs to a different account." });
    }

    const admin = adminClient();
    const { data, error } = await admin.rpc("record_captured_payment", {
      p_user_id: auth.user.id,
      p_plan_code: payment.notes.plan_code ?? "",
      p_payment_id: payment.id,
      p_order_id: payment.order_id,
      p_amount_paise: payment.amount,
      p_owner_phone: phone,
    });

    if (error) {
      console.error(`confirm-razorpay-payment failed: ${error.message}`);
      return json(400, { error: paymentErrorMessage(error.message) });
    }

    return json(200, { ok: true, orgId: data?.org_id ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not record payment";
    console.error(`confirm-razorpay-payment failed: ${message}`);
    return json(502, { error: "Could not record payment. If money was taken, it will show after a refresh." });
  }
});

function paymentErrorMessage(message: string): string {
  if (message.includes("amount does not match")) return "Payment amount does not match the plan.";
  if (message.includes("unknown plan") || message.includes("plan price")) {
    return "This plan is not available for payment.";
  }
  if (message.includes("phone does not match") || message.includes("profile is missing")) {
    return "This mobile number is not ready for checkout. Sign in again.";
  }
  return "Could not record payment.";
}
