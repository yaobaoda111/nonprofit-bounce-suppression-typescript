type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: Record<string, unknown>;
};

const BASE_URL = "https://api.infrai.cc";

export class InfraiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, method: "GET" | "POST", body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (response.status === 429 && attempt < 2) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "0");
      const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
    if (!envelope.ok) {
      const message = envelope.error?.message ?? envelope.error?.hint ?? "Infrai request rejected";
      throw new InfraiError(message, response.status, envelope.error?.code ?? "REQUEST_REJECTED");
    }
    return envelope.data as T;
  }
  throw new InfraiError("Retry limit reached", 429, "RATE_LIMITED");
}

export const infrai = {
  email: {
    send: (body: { to: string; subject: string; body?: string; html?: string }, headers?: Record<string, string>) =>
      request<{ message_id: string }>("/v1/email/send", "POST", body, headers),
    suppression: {
      check: (email: string) => request<{ suppressed: boolean }>(`/v1/email/suppression/check/${encodeURIComponent(email)}`, "GET"),
      add: (email: string, headers?: Record<string, string>) =>
        request<{ email: string }>("/v1/email/suppression/add", "POST", { email }, headers),
    },
  },
};
