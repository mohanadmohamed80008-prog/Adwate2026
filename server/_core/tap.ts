import { ENV } from "./env";

export type TapCharge = {
  id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  transaction?: { url?: string; authorization_id?: string };
  response?: { code?: string; message?: string };
  redirect?: { url?: string };
  reference?: { transaction?: string };
};

async function tapRequest<T>(path: string, init: RequestInit = {}) {
  if (!ENV.tapSecretKey) throw new Error("TAP_SECRET_KEY is not configured");
  const response = await fetch(`${ENV.tapApiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${ENV.tapSecretKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({})) as T & { message?: string; errors?: Array<{ description?: string }>; error?: string };
  if (!response.ok) {
    const detail = body.message || body.errors?.map(error => error.description).filter(Boolean).join(", ") || body.error;
    throw new Error(detail || `Tap request failed (${response.status})`);
  }
  return body;
}

export async function createTapCheckout(input: {
  amountQar: string;
  description: string;
  metadata: Record<string, string>;
}) {
  const reference = `adawati-${input.metadata.userId}-${input.metadata.plan}-${Date.now()}`;
  return tapRequest<TapCharge>("/charges", {
    method: "POST",
    body: JSON.stringify({
      amount: Number(input.amountQar),
      currency: "QAR",
      threeDSecure: true,
      description: input.description,
      reference: { transaction: reference, order: reference },
      customer: { first_name: "Adawati", last_name: "Member" },
      source: { id: "src_all" },
      redirect: { url: `${ENV.tapPublicAppUrl}/pricing?payment=return` },
      post: { url: `${ENV.tapPublicAppUrl}/api/payments/tap/webhook` },
      metadata: input.metadata,
    }),
  });
}

export async function retrieveTapCharge(id: string) {
  return tapRequest<TapCharge>(`/charges/${encodeURIComponent(id)}`);
}
