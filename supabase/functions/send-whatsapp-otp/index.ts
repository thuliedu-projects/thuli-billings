// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";
import { Webhook } from "npm:standardwebhooks@1.0.0";

const GRAPH_VERSION = "v23.0";

interface SmsHookPayload {
  user?: { phone?: string };
  sms?: { otp?: string };
}

function hookSecret(): string {
  const raw =
    Deno.env.get("SEND_SMS_HOOK_SECRET") ??
    Deno.env.get("SEND_SMS_HOOK_SECRETS") ??
    "";
  return raw.replace(/^v1,whsec_/, "");
}

function jsonError(status: number, message: string): Response {
  return Response.json(
    { error: { http_code: status, message } },
    { status, headers: { "Content-Type": "application/json" } },
  );
}

async function sendWhatsAppOtp(to: string, otp: string): Promise<void> {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const template = Deno.env.get("WHATSAPP_TEMPLATE_NAME");
  const language = Deno.env.get("WHATSAPP_TEMPLATE_LANG") ?? "en";

  if (!token || !phoneNumberId || !template) {
    throw new Error("WhatsApp secrets are not configured");
  }

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
          name: template,
          language: { code: language },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: otp }],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: otp }],
            },
          ],
        },
      }),
    },
  );

  if (response.ok) return;

  let detail = `WhatsApp API returned ${response.status}`;
  try {
    const body = await response.json();
    const message = body?.error?.message;
    if (typeof message === "string" && message.length > 0) {
      detail = message;
    }
  } catch {
    // Keep the status-only message when the body is not JSON.
  }
  throw new Error(detail);
}

console.info("send-whatsapp-otp started");

export default {
  fetch: withSupabase({ auth: "none" }, async (req) => {
    if (req.method !== "POST") {
      return jsonError(405, "Method not allowed");
    }

    const secret = hookSecret();
    if (!secret) {
      return jsonError(500, "Send SMS hook secret is not configured");
    }

    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    let event: SmsHookPayload;
    try {
      event = new Webhook(secret).verify(payload, headers) as SmsHookPayload;
    } catch {
      return jsonError(401, "Invalid hook signature");
    }

    const phone = event.user?.phone?.replace(/\D/g, "") ?? "";
    const otp = event.sms?.otp ?? "";
    if (!phone || !/^\d{6}$/.test(otp)) {
      return jsonError(400, "Hook payload is missing a phone number or OTP");
    }

    // Auth drops the hook after 5 seconds. WhatsApp often takes longer, so
    // acknowledge first and send after the response.
    const sending = sendWhatsAppOtp(phone, otp).catch((error) => {
      const message = error instanceof Error ? error.message : "WhatsApp send failed";
      console.error(`WhatsApp send failed: ${message}`);
    });
    EdgeRuntime.waitUntil(sending);

    return Response.json({});
  }),
};
