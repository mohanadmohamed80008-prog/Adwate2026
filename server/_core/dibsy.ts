import { ENV } from "./env";

export type DibsyPayment = {
  id?: string;
  status?: string;
  amount?: { value?: string; currency?: string };
  _links?: { checkout?: { href?: string } };
  details?: { failureReason?: string; failureMessage?: string };
};

async function dibsyRequest<T>(path: string, init: RequestInit = {}) {
  if (!ENV.dibsySecretKey) throw new Error("DIBSY_SECRET_KEY is not configured");
  const response = await fetch(`${ENV.dibsyApiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${ENV.dibsySecretKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({})) as T & { message?: string; error?: string };
  if (!response.ok) throw new Error(body.message || body.error || `Dibsy request failed (${response.status})`);
  return body;
}

export async function createDibsyCheckout(input: {
  amountQar: string;
  description: string;
  metadata: Record<string, string>;
}) {
  return dibsyRequest<DibsyPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({
      amount: { value: input.amountQar, currency: "QAR" },
      description: input.description,
      redirectUrl: `${ENV.dibsyPublicAppUrl}/pricing?payment=return`,
      webhookUrl: `${ENV.dibsyPublicAppUrl}/api/payments/dibsy/webhook`,
      metadata: input.metadata,
    }),
  });
}

export async function retrieveDibsyPayment(id: string) {
  return dibsyRequest<DibsyPayment>(`/payments/${encodeURIComponent(id)}`);
}
