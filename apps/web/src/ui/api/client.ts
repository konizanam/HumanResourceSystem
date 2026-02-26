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
  const validationMessage = Array.isArray(body?.errors)
    ? (body.errors[0]?.msg ?? body.errors[0]?.message)
    : undefined;

  const message =
    body?.error?.message ??
    body?.message ??
    validationMessage ??
    fallbackMessage;

  if (res.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hrs:unauthorized"));
  }

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

export type EmailAvailability = {
  available: boolean;
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

export type Company = {
  id: string;
  name: string;
  industry?: string | null;
  description?: string | null;
  website?: string | null;
  logo_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  country?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at?: string | null;
  user_count?: number | string | null;
  user_names?: string | null;
  status?: string | null;
};

export type CompanyApprovalMode = "auto_approved" | "pending";

export type UserSearchResult = {
  id: string;
  name: string;
  email: string;
  first_name?: string;
  last_name?: string;
};

export type EmailTemplateKey =
  | "registration_activation"
  | "application_received"
  | "application_success"
  | "interview_invitation"
  | "application_rejected"
  | "job_alert";

export type EmailTemplate = {
  key: string;
  title: string;
  description: string;
  subject: string;
  body_text: string;
  body_html: string;
  placeholders: string[];
  updated_at?: string;
};

type ApiEnvelope<T> = {
  status: string;
  data: T;
  message?: string;
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
/*  Companies                                                          */
/* ------------------------------------------------------------------ */

export type CompanyUpsertPayload = {
  name: string;
  industry?: string;
  description?: string;
  website?: string;
  logo_url?: string;
  contact_email?: string;
  contact_phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  country?: string;
};

export async function listCompanies(token: string): Promise<Company[]> {
  const res = await fetch(`${API_BASE}/companies`, {
    headers: authHeaders(token),
  });

  const body = await safeJson(res);
  if (!res.ok) {
    throw apiError(res, body, "Failed to load companies");
  }

  const envelope = body as ApiEnvelope<Company[]>;
  return Array.isArray(envelope?.data) ? envelope.data : [];
}

export async function createCompany(
  token: string,
  payload: CompanyUpsertPayload,
): Promise<Company> {
  const res = await fetch(`${API_BASE}/companies`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

  const body = await safeJson(res);
  if (!res.ok) {
    throw apiError(res, body, "Failed to create company");
  }

  const envelope = body as ApiEnvelope<Company>;
  return envelope.data;
}

export async function updateCompany(
  token: string,
  id: string,
  payload: CompanyUpsertPayload,
): Promise<Company> {
  const res = await fetch(`${API_BASE}/companies/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

  const body = await safeJson(res);
  if (!res.ok) {
    throw apiError(res, body, "Failed to update company");
  }

  const envelope = body as ApiEnvelope<Company>;
  return envelope.data;
}

export async function deactivateCompany(token: string, id: string): Promise<Company> {
  const res = await fetch(
    `${API_BASE}/companies/${encodeURIComponent(id)}/deactivate`,
    {
      method: "PATCH",
      headers: authHeaders(token),
    },
  );

  const body = await safeJson(res);
  if (!res.ok) {
    throw apiError(res, body, "Failed to deactivate company");
  }

  const envelope = body as ApiEnvelope<Company>;
  return envelope.data;
}

export async function reactivateCompany(token: string, id: string): Promise<Company> {
  const res = await fetch(
    `${API_BASE}/companies/${encodeURIComponent(id)}/reactivate`,
    {
      method: "PATCH",
      headers: authHeaders(token),
    },
  );

  const body = await safeJson(res);
  if (!res.ok) {
    throw apiError(res, body, "Failed to reactivate company");
  }

  const envelope = body as ApiEnvelope<Company>;
  return envelope.data;
}

export async function getCompanyApprovalMode(token: string): Promise<CompanyApprovalMode> {
  const res = await fetch(`${API_BASE}/companies/approval-mode`, {
    headers: authHeaders(token),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to load company approval mode");
  const mode = (body as any)?.data?.company_approval_mode;
  return mode === "pending" ? "pending" : "auto_approved";
}

export async function updateCompanyApprovalMode(
  token: string,
  company_approval_mode: CompanyApprovalMode,
): Promise<CompanyApprovalMode> {
  const res = await fetch(`${API_BASE}/companies/approval-mode`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ company_approval_mode }),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to update company approval mode");
  const mode = (body as any)?.data?.company_approval_mode;
  return mode === "pending" ? "pending" : "auto_approved";
}

export async function approveCompany(token: string, id: string): Promise<Company> {
  const res = await fetch(`${API_BASE}/companies/${encodeURIComponent(id)}/approve`, {
    method: "PATCH",
    headers: authHeaders(token),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to approve company");
  const envelope = body as ApiEnvelope<Company>;
  return envelope.data;
}

export async function addUserToCompany(
  token: string,
  companyId: string,
  userId: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/companies/${encodeURIComponent(companyId)}/users`,
    {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ userId }),
    },
  );

  const body = await safeJson(res);
  if (!res.ok) {
    throw apiError(res, body, "Failed to assign user to company");
  }
}

/* ------------------------------------------------------------------ */
/*  Users                                                             */
/* ------------------------------------------------------------------ */

export async function searchUsers(token: string, q: string): Promise<UserSearchResult[]> {
  const url = new URL(`${API_BASE}/users/search`);
  url.searchParams.set("q", q);

  const res = await fetch(url, {
    headers: authHeaders(token),
  });

  const body = await safeJson(res);
  if (!res.ok) {
    throw apiError(res, body, "Failed to search users");
  }

  const envelope = body as ApiEnvelope<UserSearchResult[]>;
  return Array.isArray(envelope?.data) ? envelope.data : [];
}

/* ------------------------------------------------------------------ */
/*  Email Templates                                                    */
/* ------------------------------------------------------------------ */

export async function getEmailTemplates(token: string): Promise<EmailTemplate[]> {
  const res = await fetch(`${API_BASE}/email-templates`, {
    headers: authHeaders(token),
  });

  const body = await safeJson(res);
  if (!res.ok) {
    throw apiError(res, body, "Failed to load email templates");
  }

  const envelope = body as ApiEnvelope<EmailTemplate[]>;
  return Array.isArray(envelope?.data) ? envelope.data : [];
}

export async function createEmailTemplate(
  token: string,
  payload: Pick<EmailTemplate, "key" | "title" | "description" | "subject" | "body_text" | "placeholders">,
): Promise<EmailTemplate> {
  const res = await fetch(`${API_BASE}/email-templates`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

  const body = await safeJson(res);
  if (!res.ok) {
    throw apiError(res, body, "Failed to create email template");
  }

  const envelope = body as ApiEnvelope<EmailTemplate>;
  return envelope.data;
}

export async function updateEmailTemplate(
  token: string,
  key: string,
  payload: Pick<EmailTemplate, "subject" | "body_text" | "placeholders"> &
    Partial<Pick<EmailTemplate, "title" | "description">>,
): Promise<EmailTemplate> {
  const res = await fetch(`${API_BASE}/email-templates/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

  const body = await safeJson(res);
  if (!res.ok) {
    throw apiError(res, body, "Failed to update email template");
  }

  const envelope = body as ApiEnvelope<EmailTemplate>;
  return envelope.data;
}

/* ------------------------------------------------------------------ */
/*  Notifications                                                      */
/* ------------------------------------------------------------------ */

export type NotificationItem = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  updated_at?: string;
  priority?: "low" | "normal" | "high" | "urgent";
};

export type NotificationListResponse = {
  notifications: NotificationItem[];
  pagination: { page: number; limit: number; total: number; pages: number };
  unread_count?: { total: number; by_priority?: Record<string, number> };
};

export type NotificationUnreadCount = {
  total: number;
  by_priority?: Record<string, number>;
};

export type NotificationPreferences = {
  email_notifications: boolean;
  job_alerts: boolean;
  application_updates: boolean;
  in_app_notifications?: boolean;
  push_notifications?: boolean;
  message_notifications?: boolean;
  marketing_emails?: boolean;
};

export async function listNotifications(
  token: string,
  params?: { page?: number; limit?: number; is_read?: boolean },
): Promise<NotificationListResponse> {
  const url = new URL(`${API_BASE}/notifications`);
  if (params?.page) url.searchParams.set("page", String(params.page));
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.is_read !== undefined) {
    url.searchParams.set("is_read", String(params.is_read));
  }

  const res = await fetch(url, { headers: authHeaders(token) });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to load notifications");

  const data = (body ?? {}) as NotificationListResponse;
  return {
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    pagination: data.pagination ?? { page: 1, limit: 20, total: 0, pages: 1 },
    unread_count: data.unread_count,
  };
}

export async function getUnreadNotificationCount(token: string): Promise<NotificationUnreadCount> {
  const res = await fetch(`${API_BASE}/notifications/unread-count`, {
    headers: authHeaders(token),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to load unread notification count");
  return {
    total: Number((body as any)?.total ?? 0),
    by_priority: (body as any)?.by_priority ?? {},
  };
}

export async function markNotificationAsRead(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/notifications/${encodeURIComponent(id)}/read`, {
    method: "PUT",
    headers: authHeaders(token),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to mark notification as read");
}

export async function markAllNotificationsAsRead(token: string): Promise<number> {
  const res = await fetch(`${API_BASE}/notifications/read-all`, {
    method: "PUT",
    headers: authHeaders(token),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to mark all notifications as read");
  return Number((body as any)?.count ?? 0);
}

export async function deleteNotification(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/notifications/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to delete notification");
}

export async function getNotificationPreferences(token: string): Promise<NotificationPreferences> {
  const res = await fetch(`${API_BASE}/notifications/preferences`, {
    headers: authHeaders(token),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to load notification preferences");
  return body as NotificationPreferences;
}

export async function updateNotificationPreferences(
  token: string,
  payload: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const res = await fetch(`${API_BASE}/notifications/preferences`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to update notification preferences");
  return body as NotificationPreferences;
}

/* ------------------------------------------------------------------ */
/*  Auth                                                               */
/* ------------------------------------------------------------------ */

export async function checkEmailAvailable(email: string): Promise<boolean> {
  const url = new URL(`${API_BASE}/auth/email-available`);
  url.searchParams.set("email", email);

  const res = await fetch(url);
  if (!res.ok) {
    const body = await safeJson(res);
    throw apiError(res, body, "Failed to check email availability");
  }

  const body = (await res.json()) as EmailAvailability;
  return Boolean(body?.available);
}

export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Cannot reach API server at ${API_URL}. Check that the backend is running.`);
    }
    throw error;
  }

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
    throw apiError(res, body, "Registration failed");
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
  if (!res.ok) {
    const body = await safeJson(res);
    throw apiError(res, body, "Unauthorized");
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Job Seeker Profile                                                 */
/* ------------------------------------------------------------------ */

export async function getFullProfile(
  token: string
): Promise<FullProfile> {
  if (!token) {
    throw new Error("Missing access token");
  }
  const res = await fetch(`${API_BASE}/profile/complete`, {
    headers: { authorization: `Bearer ${token}` },
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
  // Backend expects snake_case keys. Accept either shape.
  const d: any = data ?? {};
  const payload: Record<string, unknown> = {
    professional_summary: d.professional_summary ?? d.professionalSummary,
    field_of_expertise: d.field_of_expertise ?? d.fieldOfExpertise,
    qualification_level: d.qualification_level ?? d.qualificationLevel,
    years_experience: d.years_experience ?? d.yearsExperience,
  };

  const res = await fetch(`${API_BASE}/profile`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    throw apiError(res, body, "Failed to update profile");
  }
  return res.json();
}

export async function updatePersonalDetails(
  token: string,
  data: Record<string, unknown>
) {
  // Backend expects snake_case keys. Accept either shape.
  const d: any = data ?? {};
  const payload = {
    first_name: d.first_name ?? d.firstName,
    last_name: d.last_name ?? d.lastName,
    middle_name: d.middle_name ?? d.middleName,
    gender: d.gender,
    date_of_birth: d.date_of_birth ?? d.dateOfBirth,
    nationality: d.nationality,
    id_type: d.id_type ?? d.idType,
    id_number: d.id_number ?? d.idNumber,
    marital_status: d.marital_status ?? d.maritalStatus,
    disability_status: d.disability_status ?? d.disabilityStatus,
  };

  const res = await fetch(`${API_BASE}/profile/personal-details`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
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
  // Backend expects snake_case keys. Accept either shape.
  const d: any = data ?? {};
  const payload = {
    address_line1: d.address_line1 ?? d.addressLine1,
    address_line2: d.address_line2 ?? d.addressLine2,
    city: d.city,
    state: d.state,
    country: d.country,
    postal_code: d.postal_code ?? d.postalCode,
    is_primary: d.is_primary ?? d.isPrimary,
  };

  const url = id
    ? `${API_BASE}/profile/addresses/${id}`
    : `${API_BASE}/profile/addresses`;
  const res = await fetch(url, {
    method: id ? "PUT" : "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
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
  if (!res.ok) {
    const body = await safeJson(res);
    throw apiError(res, body, "Failed to delete address");
  }
}

export async function saveEducation(
  token: string,
  data: Record<string, unknown>,
  id?: string
) {
  const d: any = data ?? {};
  const payload = {
    institution_name: (d.institution_name ?? d.institutionName ?? "").toString(),
    qualification: (d.qualification ?? "").toString(),
    field_of_study: (d.field_of_study ?? d.fieldOfStudy ?? "").toString(),
    start_date: (d.start_date ?? d.startDate ?? "").toString(),
    end_date:
      Boolean(d.is_current ?? d.isCurrent)
        ? undefined
        : (d.end_date ?? d.endDate ?? "").toString() || undefined,
    is_current: Boolean(d.is_current ?? d.isCurrent),
    grade: (d.grade ?? "").toString() || undefined,
  };

  const url = id
    ? `${API_BASE}/profile/education/${id}`
    : `${API_BASE}/profile/education`;
  const res = await fetch(url, {
    method: id ? "PUT" : "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
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
  if (!res.ok) {
    const body = await safeJson(res);
    throw apiError(res, body, "Failed to delete education");
  }
}

export async function saveExperience(
  token: string,
  data: Record<string, unknown>,
  id?: string
) {
  // Backend expects snake_case keys. Accept either shape.
  const d: any = data ?? {};
  const isCurrent = Boolean(d.is_current ?? d.isCurrent);
  const payload = {
    company_name: (d.company_name ?? d.companyName ?? "").toString(),
    job_title: (d.job_title ?? d.jobTitle ?? "").toString(),
    employment_type: (d.employment_type ?? d.employmentType ?? "").toString(),
    start_date: (d.start_date ?? d.startDate ?? "").toString() || undefined,
    end_date:
      isCurrent
        ? undefined
        : ((d.end_date ?? d.endDate ?? "").toString() || undefined),
    is_current: isCurrent,
    responsibilities: (d.responsibilities ?? "").toString(),
    salary:
      d.salary === undefined || d.salary === null || d.salary === ""
        ? undefined
        : Number(d.salary),
  };

  const url = id
    ? `${API_BASE}/profile/experience/${id}`
    : `${API_BASE}/profile/experience`;
  const res = await fetch(url, {
    method: id ? "PUT" : "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    throw apiError(res, body, "Failed to save experience");
  }
  return res.json();
}

export async function deleteExperience(token: string, id: string) {
  const res = await fetch(`${API_BASE}/profile/experience/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    throw apiError(res, body, "Failed to delete experience");
  }
}

export async function saveReference(
  token: string,
  data: Record<string, unknown>,
  id?: string
) {
  // Backend expects snake_case keys. Accept either shape.
  const d: any = data ?? {};
  const payload = {
    full_name: (d.full_name ?? d.fullName ?? "").toString(),
    relationship: (d.relationship ?? "").toString(),
    company: (d.company ?? "").toString(),
    email: (d.email ?? "").toString(),
    phone: (d.phone ?? "").toString(),
  };

  const url = id
    ? `${API_BASE}/profile/references/${id}`
    : `${API_BASE}/profile/references`;
  const res = await fetch(url, {
    method: id ? "PUT" : "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    throw apiError(res, body, "Failed to save reference");
  }
  return res.json();
}

export async function deleteReference(token: string, id: string) {
  const res = await fetch(`${API_BASE}/profile/references/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    throw apiError(res, body, "Failed to delete reference");
  }
}

/* ------------------------------------------------------------------ */
/*  Admin Roles                                                        */
/* ------------------------------------------------------------------ */

export type Role = {
  id: string;
  name: string;
  description?: string | null;
  user_count?: number;
  permission_count?: number;
  created_at?: string;
};

export type Permission = {
  id: string;
  name: string;
  description?: string | null;
  module_name: string;
  action_type: string;
  created_at?: string;
};

export type RoleDetail = Role & {
  permissions: Permission[];
  users: { id: string; email: string; first_name: string; last_name: string }[];
};

export async function listRoles(
  token: string,
  params?: { page?: number; limit?: number; search?: string },
): Promise<{ roles: Role[]; pagination: Pagination }> {
  const url = new URL(`${API_BASE}/admin/roles`);
  if (params?.page) url.searchParams.set("page", String(params.page));
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.search) url.searchParams.set("search", params.search);

  const res = await fetch(url, { headers: authHeaders(token) });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to load roles");
  return body as { roles: Role[]; pagination: Pagination };
}

export async function getRole(token: string, id: string): Promise<RoleDetail> {
  const res = await fetch(`${API_BASE}/admin/roles/${encodeURIComponent(id)}`, {
    headers: authHeaders(token),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to load role");
  return body as RoleDetail;
}

export async function createRole(
  token: string,
  payload: { name: string; description?: string },
): Promise<Role> {
  const res = await fetch(`${API_BASE}/admin/roles`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to create role");
  return body as Role;
}

export async function updateRole(
  token: string,
  id: string,
  payload: { name: string; description?: string },
): Promise<Role> {
  const res = await fetch(`${API_BASE}/admin/roles/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to update role");
  return body as Role;
}

export async function deleteRole(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/roles/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to delete role");
}

export async function getRolePermissions(
  token: string,
  roleId: string,
): Promise<{ role_id: string; role_name: string; permissions: Permission[]; all_permissions: Permission[] }> {
  const res = await fetch(
    `${API_BASE}/admin/roles/${encodeURIComponent(roleId)}/permissions`,
    { headers: authHeaders(token) },
  );
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to load role permissions");
  return body;
}

export async function setRolePermissions(
  token: string,
  roleId: string,
  permissionIds: string[],
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/admin/roles/${encodeURIComponent(roleId)}/permissions`,
    {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify({ permission_ids: permissionIds }),
    },
  );
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to assign permissions");
}

export async function listPermissions(
  token: string,
): Promise<{ permissions: Permission[]; grouped: Record<string, Permission[]> }> {
  const res = await fetch(`${API_BASE}/admin/permissions`, {
    headers: authHeaders(token),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to load permissions");
  return body;
}

/* ------------------------------------------------------------------ */
/*  Job Categories                                                     */
/* ------------------------------------------------------------------ */

export type JobSubcategory = {
  id: string;
  category_id: string;
  name: string;
  category_name?: string;
};

export type JobCategory = {
  id: string;
  name: string;
  subcategories: JobSubcategory[];
  job_counts?: { total_jobs: number; active_jobs: number };
};

export async function listJobCategories(
  token: string,
): Promise<{ categories: JobCategory[]; total_categories: number }> {
  const res = await fetch(`${API_BASE}/jobs/categories`, {
    headers: authHeaders(token),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to load job categories");
  return body;
}

export async function createJobCategory(
  token: string,
  payload: { name: string },
): Promise<JobCategory> {
  const res = await fetch(`${API_BASE}/jobs/categories`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to create category");
  return body as JobCategory;
}

export async function updateJobCategory(
  token: string,
  id: string,
  payload: { name: string },
): Promise<JobCategory> {
  const res = await fetch(`${API_BASE}/jobs/categories/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to update category");
  return body as JobCategory;
}

export async function deleteJobCategory(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/categories/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to delete category");
}

export async function createJobSubcategory(
  token: string,
  payload: { category_id: string; name: string },
): Promise<JobSubcategory> {
  const res = await fetch(`${API_BASE}/jobs/subcategories`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to create subcategory");
  return body as JobSubcategory;
}

export async function updateJobSubcategory(
  token: string,
  id: string,
  payload: { name: string; category_id?: string },
): Promise<JobSubcategory> {
  const res = await fetch(`${API_BASE}/jobs/subcategories/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to update subcategory");
  return body as JobSubcategory;
}

export async function deleteJobSubcategory(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/subcategories/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to delete subcategory");
}

/* ------------------------------------------------------------------ */
/*  Admin Users                                                        */
/* ------------------------------------------------------------------ */

export type AdminUser = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  is_active?: boolean;
  is_blocked?: boolean;
  blocked_at?: string | null;
  block_reason?: string | null;
  email_verified?: boolean;
  last_login?: string | null;
  created_at?: string;
  company_name?: string | null;
  phone?: string | null;
  login_count?: number;
  // detail fields
  jobs_posted?: number;
  applications_submitted?: number;
  skills?: any[] | null;
  certifications?: any[] | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export async function listAdminUsers(
  token: string,
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  },
): Promise<{
  users: AdminUser[];
  pagination: Pagination;
  summary: { total_users: number; active_users: number; blocked_users: number };
}> {
  const url = new URL(`${API_BASE}/admin/users`);
  if (params?.page) url.searchParams.set("page", String(params.page));
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.search) url.searchParams.set("search", params.search);
  if (params?.role) url.searchParams.set("role", params.role);
  if (params?.status) url.searchParams.set("status", params.status);

  const res = await fetch(url, { headers: authHeaders(token) });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to load users");
  return body;
}

export async function getAdminUser(token: string, id: string): Promise<AdminUser> {
  const res = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(id)}`, {
    headers: authHeaders(token),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to load user");
  return body as AdminUser;
}

export async function blockUser(
  token: string,
  id: string,
  payload: { block: boolean; reason?: string },
): Promise<{ message: string; user: AdminUser }> {
  const res = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(id)}/block`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to update user block status");
  return body;
}

/* ------------------------------------------------------------------ */
/*  Admin Jobs                                                         */
/* ------------------------------------------------------------------ */

export type AdminJob = {
  id: string;
  title: string;
  description?: string;
  company?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  category?: string;
  experience_level?: string;
  employment_type?: string;
  status?: string;
  remote?: boolean;
  is_featured?: boolean;
  is_flagged?: boolean;
  views?: number;
  applications_count?: number;
  employer_id?: string;
  employer_name?: string;
  employer_email?: string;
  reports_count?: number;
  application_deadline?: string;
  created_at?: string;
};

export type JobApplicationStatus = string;

export type JobApplication = {
  id: string;
  job_id: string;
  applicant_id: string;
  cover_letter?: string | null;
  resume_url?: string | null;
  status: JobApplicationStatus;
  created_at?: string;
  updated_at?: string;
  applicant_name?: string | null;
  applicant_email?: string | null;
  applicant_phone?: string | null;
  applicant_resume?: string | null;
  workflow_status?: string | null;
};

export type MyApplicationsResponse = {
  applications: JobApplication[];
  pagination: Pagination;
};

export type JobListItem = {
  id: string;
  company_id?: string | null;
  title: string;
  description?: string | null;
  company?: string | null;
  location?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  category?: string | null;
  experience_level?: string | null;
  employment_type?: string | null;
  status?: string | null;
  remote?: boolean | null;
  requirements?: unknown[] | null;
  responsibilities?: unknown[] | null;
  benefits?: unknown[] | null;
  application_deadline?: string | null;
  employer_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  employer_name?: string | null;
  employer_email?: string | null;
  applications_count?: number | string | null;
};

export type JobUpsertPayload = {
  title: string;
  description: string;
  company: string;
  company_id?: string;
  subcategory?: string;
  location: string;
  salary_min: number;
  salary_max: number;
  salary_currency?: string;
  category: string;
  experience_level: "Entry" | "Intermediate" | "Senior" | "Lead";
  employment_type: "Full-time" | "Part-time" | "Contract" | "Internship";
  remote?: boolean;
  requirements?: string[];
  responsibilities?: string[];
  benefits?: string[];
  application_deadline: string;
  status?: "active" | "closed" | "draft" | "pending";
};

export async function listAdminJobs(
  token: string,
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    flagged?: boolean;
    featured?: boolean;
  },
): Promise<{
  jobs: AdminJob[];
  pagination: Pagination;
  summary: { total_jobs: number; active_jobs: number; flagged_jobs: number };
}> {
  const url = new URL(`${API_BASE}/admin/jobs`);
  if (params?.page) url.searchParams.set("page", String(params.page));
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.search) url.searchParams.set("search", params.search);
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.flagged !== undefined) url.searchParams.set("flagged", String(params.flagged));
  if (params?.featured !== undefined) url.searchParams.set("featured", String(params.featured));

  const res = await fetch(url, { headers: authHeaders(token) });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to load jobs");
  return body;
}

export async function deleteAdminJob(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/jobs/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to delete job");
}

export async function featureAdminJob(
  token: string,
  id: string,
  featured: boolean,
): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/jobs/${encodeURIComponent(id)}/feature`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ is_featured: featured }),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to update job feature status");
}

export async function listJobApplicationsForJob(
  token: string,
  jobId: string,
  params?: { page?: number; limit?: number },
): Promise<{
  job_title?: string;
  applications: JobApplication[];
  pagination: Pagination;
}> {
  const url = new URL(`${API_BASE}/jobs/${encodeURIComponent(jobId)}/applications`);
  if (params?.page) url.searchParams.set("page", String(params.page));
  if (params?.limit) url.searchParams.set("limit", String(params.limit));

  const res = await fetch(url, { headers: authHeaders(token) });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to load job applications");
  return body;
}

export async function updateJobApplicationStatus(
  token: string,
  jobId: string,
  applicationId: string,
  status: string,
): Promise<JobApplication> {
  const res = await fetch(
    `${API_BASE}/jobs/${encodeURIComponent(jobId)}/applications/${encodeURIComponent(applicationId)}/status`,
    {
      method: "PATCH",
      headers: authHeaders(token),
      body: JSON.stringify({ status }),
    },
  );
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to update application status");
  return body as JobApplication;
}

export async function listMyApplications(
  token: string,
  params?: { page?: number; limit?: number; status?: string; sort?: "newest" | "oldest" },
): Promise<MyApplicationsResponse> {
  const url = new URL(`${API_BASE}/applications`);
  if (params?.page) url.searchParams.set("page", String(params.page));
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.sort) url.searchParams.set("sort", params.sort);
  const res = await fetch(url, { headers: authHeaders(token) });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to load applications");
  return body as MyApplicationsResponse;
}

export async function applyToJob(
  token: string,
  payload: { job_id: string; cover_letter?: string; resume_url?: string },
): Promise<JobApplication> {
  const res = await fetch(`${API_BASE}/applications`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to apply for this job");
  return body as JobApplication;
}

export async function listJobs(
  token: string,
  params?: {
    page?: number;
    limit?: number;
    status?: string;
    my_jobs?: boolean;
    company_id?: string;
  },
): Promise<{
  jobs: JobListItem[];
  pagination: Pagination;
  showing?: string;
}> {
  const url = new URL(`${API_BASE}/jobs`);
  if (params?.page) url.searchParams.set("page", String(params.page));
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.status) url.searchParams.set("status", params.status);
  if (params?.my_jobs !== undefined) url.searchParams.set("my_jobs", String(params.my_jobs));
  if (params?.company_id) url.searchParams.set("company_id", params.company_id);

  const res = await fetch(url, { headers: authHeaders(token) });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to load jobs");
  return body;
}

export async function createJob(
  token: string,
  payload: JobUpsertPayload,
): Promise<JobListItem> {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to create job");
  return body as JobListItem;
}

export async function updateJob(
  token: string,
  id: string,
  payload: JobUpsertPayload,
): Promise<JobListItem> {
  const res = await fetch(`${API_BASE}/jobs/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to update job");
  return body as JobListItem;
}

export async function deleteJob(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to delete job");
}

export async function getUserRoles(
  token: string,
  userId: string,
): Promise<{ user_id: string; roles: { id: string; name: string }[]; all_roles: { id: string; name: string }[] }> {
  const res = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(userId)}/roles`, {
    headers: authHeaders(token),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to load user roles");
  return body;
}

export async function setUserRoles(
  token: string,
  userId: string,
  roleIds: string[],
): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(userId)}/roles`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ role_ids: roleIds }),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to assign user roles");
}

export type JobSeekerFullProfile = {
  profile: Record<string, unknown> | null;
  personalDetails: Record<string, unknown> | null;
  addresses: Record<string, unknown>[];
  education: Record<string, unknown>[];
  experience: Record<string, unknown>[];
  references: Record<string, unknown>[];
};

export async function getJobSeekerFullProfile(
  token: string,
  userId?: string,
): Promise<JobSeekerFullProfile> {
  const url = new URL(`${API_BASE}/job-seeker/full-profile`);
  if (userId) url.searchParams.set("user_id", userId);
  const res = await fetch(url, {
    headers: authHeaders(token),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to load job seeker profile");
  return body as JobSeekerFullProfile;
}

/* ------------------------------------------------------------------ */
/*  Admin Statistics (Reports)                                         */
/* ------------------------------------------------------------------ */

export type AdminStatistics = {
  users: {
    total: number; active: number; blocked: number;
    job_seekers: number; employers: number; admins: number; hr: number;
    new_today: number; new_this_week: number; new_this_month: number;
  };
  jobs: {
    total: number; active: number; closed: number; draft: number;
    featured: number; flagged: number;
    new_today: number; new_this_week: number;
    total_views: number; total_applications: number;
  };
  applications: {
    total: number; pending: number; reviewed: number;
    accepted: number; rejected: number; withdrawn: number;
    new_today: number;
  };
  system: {
    api_requests_today: number; active_sessions: number;
    storage_used: string; last_backup: string | null; version: string;
  };
};

export async function getAdminStatistics(token: string): Promise<AdminStatistics> {
  const res = await fetch(`${API_BASE}/admin/statistics`, {
    headers: authHeaders(token),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to load statistics");
  return body as AdminStatistics;
}

/* ------------------------------------------------------------------ */
/*  Admin Audit Logs                                                   */
/* ------------------------------------------------------------------ */

export type AuditLog = {
  id: string;
  admin_id: string;
  admin_name?: string;
  admin_email?: string;
  action: string;
  target_type: string;
  target_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
};

export async function listAuditLogs(
  token: string,
  params?: {
    page?: number;
    limit?: number;
    action?: string;
    target_type?: string;
  },
): Promise<{ logs: AuditLog[]; pagination: Pagination }> {
  const url = new URL(`${API_BASE}/admin/audit-logs`);
  if (params?.page) url.searchParams.set("page", String(params.page));
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.action) url.searchParams.set("action", params.action);
  if (params?.target_type) url.searchParams.set("target_type", params.target_type);

  const res = await fetch(url, { headers: authHeaders(token) });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to load audit logs");
  return body;
}

/* ------------------------------------------------------------------ */
/*  Permissions CRUD                                                   */
/* ------------------------------------------------------------------ */

export async function createPermission(
  token: string,
  payload: { name: string; description?: string; module_name: string; action_type: string },
): Promise<Permission> {
  const res = await fetch(`${API_BASE}/admin/permissions`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to create permission");
  return body as Permission;
}

export async function deletePermission(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/permissions/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  const body = await safeJson(res);
  if (!res.ok) throw apiError(res, body, "Failed to delete permission");
}