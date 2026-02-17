const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export type LoginResponse = {
  tokenType: "Bearer";
  accessToken: string;
  expiresIn: string;
  user: { id: string; email: string; name: string; roles: string[] };
};

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await safeJson(res);
    const message = body?.error?.message ?? "Login failed";
    throw new Error(message);
  }

  return (await res.json()) as LoginResponse;
}

export async function me(accessToken: string) {
  const res = await fetch(`${API_URL}/api/me`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error("Unauthorized");
  }
  return res.json();
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}
