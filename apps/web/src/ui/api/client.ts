const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const API_BASE = `${API_URL}/api/v1`;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

function apiError(res: Response, body: any, fallbackMessage: string) {
  const message =
    body?.error?.message ??
    body?.message ??
    fallbackMessage;

  return Object.assign(new Error(message), { status: res.status });
}

function authHeaders(token: string): HeadersInit {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
  };
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type LoginResponse = {
  tokenType: "Bearer";
  accessToken: string;
  expiresIn: string;
  user: { id: string; email: string; name: string; roles: string[] };
};

export type LoginTwoFactorResponse = {
  requiresTwoFactor: true;
  challengeId: string;
  expiresInSeconds: number;
  message: string;
};

export type TwoFactorChallengeResponse = {
  challengeId: string;
  expiresInSeconds: number;
};

export type LoginResult = LoginResponse | LoginTwoFactorResponse;

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type FullProfile = {
  profile: Record<string, unknown> | null;
  personalDetails: Record<string, unknown> | null;
  addresses: Record<string, unknown>[];
  education: Record<string, unknown>[];
  experience: Record<string, unknown>[];
  references: Record<string, unknown>[];
};

export type IpLocation = {
  ip: string | null;
  countryCode: string | null;
  countryName: string | null;
  region: string | null;
  city: string | null;
};

/* ------------------------------------------------------------------ */
/*  Geo                                                               */
/* ------------------------------------------------------------------ */

export async function getIpLocation(): Promise<IpLocation> {
  const res = await fetch(`${API_BASE}/geo/ip`);
  if (!res.ok) {
    const body = await safeJson(res);
    throw apiError(res, body, "Failed to determine location");
  }
  return (await res.json()) as IpLocation;
}

/* ------------------------------------------------------------------ */
/*  Auth                                                               */
/* ------------------------------------------------------------------ */

export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await safeJson(res);
    throw new Error(body?.error?.message ?? "Login failed");
  }

  return (await res.json()) as LoginResult;
}

export async function verifyTwoFactor(
  challengeId: string,
  code: string
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/2fa/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ challengeId, code }),
  });

  if (!res.ok) {
    const body = await safeJson(res);
    throw new Error(body?.error?.message ?? "Two-factor verification failed");
  }

  return (await res.json()) as LoginResponse;
}

export async function requestTwoFactorChallenge(
  email: string,
  password: string
): Promise<TwoFactorChallengeResponse> {
  const res = await fetch(`${API_BASE}/auth/2fa/challenge`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await safeJson(res);
    throw apiError(res, body, "Failed to resend authentication code");
  }

  const body = (await res.json()) as any;
  return {
    challengeId: String(body?.challengeId ?? ""),
    expiresInSeconds: Number(body?.expiresInSeconds ?? 300),
  };
}

export async function register(
  payload: RegisterPayload
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await safeJson(res);
    throw new Error(body?.error?.message ?? "Registration failed");
  }

  return (await res.json()) as LoginResponse;
}

export async function forgotPassword(email: string) {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function resetPassword(
  token: string,
  password: string,
  confirmPassword: string
) {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, password, confirmPassword }),
  });

  if (!res.ok) {
    const body = await safeJson(res);
    throw new Error(body?.error?.message ?? "Password reset failed");
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  User                                                               */
/* ------------------------------------------------------------------ */

export async function me(accessToken: string) {
  const res = await fetch(`${API_BASE}/users/me`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Unauthorized");
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Job Seeker Profile                                                 */
/* ------------------------------------------------------------------ */

export async function getFullProfile(
  token: string
): Promise<FullProfile> {
  const res = await fetch(`${API_BASE}/profile/complete`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    throw apiError(res, body, "Failed to load profile");
  }

  const body = (await res.json()) as any;
  return (body?.data ?? body) as FullProfile;
}

export async function updateProfile(
  token: string,
  data: Record<string, unknown>
) {
  const res = await fetch(`${API_BASE}/profile`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    throw new Error(body?.error?.message ?? "Failed to update profile");
  }
  return res.json();
}

export async function updatePersonalDetails(
  token: string,
  data: Record<string, unknown>
) {
  const res = await fetch(`${API_BASE}/profile/personal-details`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    throw new Error(body?.error?.message ?? "Failed to update personal details");
  }
  return res.json();
}

export async function saveAddress(
  token: string,
  data: Record<string, unknown>,
  id?: string
) {
  const url = id
    ? `${API_BASE}/profile/addresses/${id}`
    : `${API_BASE}/profile/addresses`;
  const res = await fetch(url, {
    method: id ? "PUT" : "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    throw new Error(body?.error?.message ?? "Failed to save address");
  }
  return res.json();
}

export async function deleteAddress(token: string, id: string) {
  const res = await fetch(`${API_BASE}/profile/addresses/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete address");
  return res.json();
}

export async function saveEducation(
  token: string,
  data: Record<string, unknown>,
  id?: string
) {
  const url = id
    ? `${API_BASE}/profile/education/${id}`
    : `${API_BASE}/profile/education`;
  const res = await fetch(url, {
    method: id ? "PUT" : "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    throw new Error(body?.error?.message ?? "Failed to save education");
  }
  return res.json();
}

export async function deleteEducation(token: string, id: string) {
  const res = await fetch(`${API_BASE}/profile/education/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete education");
  return res.json();
}

export async function saveExperience(
  token: string,
  data: Record<string, unknown>,
  id?: string
) {
  const url = id
    ? `${API_BASE}/profile/experience/${id}`
    : `${API_BASE}/profile/experience`;
  const res = await fetch(url, {
    method: id ? "PUT" : "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    throw new Error(body?.error?.message ?? "Failed to save experience");
  }
  return res.json();
}

export async function deleteExperience(token: string, id: string) {
  const res = await fetch(`${API_BASE}/profile/experience/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete experience");
  return res.json();
}

export async function saveReference(
  token: string,
  data: Record<string, unknown>,
  id?: string
) {
  const url = id
    ? `${API_BASE}/profile/references/${id}`
    : `${API_BASE}/profile/references`;
  const res = await fetch(url, {
    method: id ? "PUT" : "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    throw new Error(body?.error?.message ?? "Failed to save reference");
  }
  return res.json();
}

export async function deleteReference(token: string, id: string) {
  const res = await fetch(`${API_BASE}/profile/references/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete reference");
  return res.json();
}
