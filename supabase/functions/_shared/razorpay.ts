import { createHmac, timingSafeEqual } from "node:crypto";

export type RazorpayPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  notes: Record<string, string>;
};

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
};

export function razorpayKeys(): { keyId: string; keySecret: string } | null {
  const keyId = Deno.env.get("RAZORPAY_KEY_ID")?.trim() ?? "";
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET")?.trim() ?? "";
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

export function webhookSecret(): string {
  return Deno.env.get("RAZORPAY_WEBHOOK_SECRET")?.trim() ?? "";
}

function basicAuth(keyId: string, keySecret: string): string {
  return `Basic ${btoa(`${keyId}:${keySecret}`)}`;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function paymentSignature(orderId: string, paymentId: string, secret: string): string {
  return createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

export function signaturesMatch(actual: string, expected: string): boolean {
  return safeEqual(actual, expected);
}

export function webhookSignature(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

function asNotes(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const notes: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") notes[key] = entry;
  }
  return notes;
}

export async function createOrder(input: {
  keyId: string;
  keySecret: string;
  amount: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<RazorpayOrder> {
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: basicAuth(input.keyId, input.keySecret),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes,
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const description = body?.error?.description;
    throw new Error(typeof description === "string" ? description : "Could not start payment");
  }
  return body as RazorpayOrder;
}

export async function fetchPayment(
  keyId: string,
  keySecret: string,
  paymentId: string,
): Promise<RazorpayPayment> {
  const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    headers: { Authorization: basicAuth(keyId, keySecret) },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.id) {
    const description = body?.error?.description;
    throw new Error(typeof description === "string" ? description : "Could not verify payment");
  }
  return {
    id: String(body.id),
    order_id: String(body.order_id ?? ""),
    amount: Number(body.amount),
    currency: String(body.currency ?? ""),
    status: String(body.status ?? ""),
    notes: asNotes(body.notes),
  };
}
