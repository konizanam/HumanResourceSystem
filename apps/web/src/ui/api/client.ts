const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

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

/* ------------------------------------------------------------------ */
/*  Auth                                                               */
/* ------------------------------------------------------------------ */

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await safeJson(res);
    throw new Error(body?.error?.message ?? "Login failed");
  }

  return (await res.json()) as LoginResponse;
}

export async function register(
  payload: RegisterPayload
): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/api/auth/register`, {
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
  const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
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
  const res = await fetch(`${API_URL}/api/auth/reset-password`, {
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
  const res = await fetch(`${API_URL}/api/me`, {
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
  const res = await fetch(`${API_URL}/api/job-seeker/full-profile`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to load profile");
  return res.json();
}

export async function updateProfile(
  token: string,
  data: Record<string, unknown>
) {
  const res = await fetch(`${API_URL}/api/job-seeker/profile`, {
    method: "PUT",
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
  const res = await fetch(`${API_URL}/api/job-seeker/personal-details`, {
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
    ? `${API_URL}/api/job-seeker/addresses/${id}`
    : `${API_URL}/api/job-seeker/addresses`;
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
  const res = await fetch(`${API_URL}/api/job-seeker/addresses/${id}`, {
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
    ? `${API_URL}/api/job-seeker/education/${id}`
    : `${API_URL}/api/job-seeker/education`;
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
  const res = await fetch(`${API_URL}/api/job-seeker/education/${id}`, {
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
    ? `${API_URL}/api/job-seeker/experience/${id}`
    : `${API_URL}/api/job-seeker/experience`;
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
  const res = await fetch(`${API_URL}/api/job-seeker/experience/${id}`, {
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
    ? `${API_URL}/api/job-seeker/references/${id}`
    : `${API_URL}/api/job-seeker/references`;
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
  const res = await fetch(`${API_URL}/api/job-seeker/references/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete reference");
  return res.json();
}
