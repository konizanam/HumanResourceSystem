import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import {
  type Company,
  type CompanyUpsertPayload,
  type JobCategory,
  type JobUpsertPayload,
  type UserSearchResult,
  addUserToCompany,
  approveCompany,
  createJob,
  createCompany,
  deactivateCompany,
  getCompanyUsers,
  listJobCategories,
  listCompanies,
  reactivateCompany,
  searchUsers,
  updateCompany,
} from "../api/client";
import { RichTextEditor, normalizeRichTextForSave, richTextToPlainText } from "../components/RichText";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";
import { useNavigate } from "react-router-dom";

const COMPANY_PAGE_LIMIT = 5;

type PanelMode = "view" | "edit";

type PanelModeExtended = PanelMode | "post-job";

type CompanyJobFormState = {
  title: string;
  description: string;
  category_id: string;
  subcategory: string;
  salary_min: string;
  salary_max: string;
  employment_type: JobUpsertPayload["employment_type"];
  location: string;
  remote: boolean;
  application_deadline: string;
  status: "draft" | "pending";
};

const INDUSTRY_SUGGESTIONS = [
  "Agriculture",
  "Automotive",
  "Banking",
  "Construction",
  "Education",
  "Energy",
  "Engineering",
  "Finance",
  "Government",
  "Healthcare",
  "Hospitality",
  "Insurance",
  "Legal",
  "Logistics",
  "Manufacturing",
  "Media",
  "Mining",
  "Non-profit",
  "Real Estate",
  "Retail",
  "Telecommunications",
  "Technology / ICT",
  "Transportation",
  "Travel",
  "Utilities",
];

const EMPTY_COMPANY: CompanyUpsertPayload = {
  name: "",
  industry: "",
  description: "",
  website: "",
  logoFile: null,
  contact_email: "",
  contact_phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  country: "",
};

const EMPTY_COMPANY_JOB_FORM: CompanyJobFormState = {
  title: "",
  description: "",
  category_id: "",
  subcategory: "",
  salary_min: "",
  salary_max: "",
  employment_type: "Full-time",
  location: "",
  remote: false,
  application_deadline: "",
  status: "draft",
};

function toText(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function normalizePayload(form: CompanyUpsertPayload): CompanyUpsertPayload {
  const cleaned: CompanyUpsertPayload = {
    name: form.name.trim(),
  };

  const optionalKeys: (keyof Omit<CompanyUpsertPayload, "name" | "logoFile">)[] = [
    "industry",
    "description",
    "website",
    "contact_email",
    "contact_phone",
    "address_line1",
    "address_line2",
    "city",
    "country",
  ];

  for (const key of optionalKeys) {
    const raw = (form[key] ?? "").trim();
    if (raw) (cleaned as any)[key] = raw;
  }

  if (form.logoFile) cleaned.logoFile = form.logoFile;

  return cleaned;
}

function sanitizePhoneInput(raw: string): string {
  // Allow: leading '+', digits, spaces. Strip everything else.
  let v = raw.replace(/[^\d+\s]/g, "");

  // Only keep '+' if it's the first non-space character.
  v = v.replace(/\+(?=.)/g, (_match, offset) => (offset === 0 ? "+" : ""));

  // Normalize spaces.
  v = v.replace(/\s+/g, " ").trimStart();

  // Enforce max 13 digits (keep spaces, but stop adding more digits).
  let digitCount = 0;
  let out = "";
  for (const ch of v) {
    if (ch >= "0" && ch <= "9") {
      if (digitCount >= 13) continue;
      digitCount += 1;
      out += ch;
    } else if (ch === "+") {
      if (out.length === 0) out += ch;
    } else if (ch === " ") {
      if (out.length > 0 && out[out.length - 1] !== " ") out += ch;
    }
  }

  return out;
}

function validateNamibiaPhone(raw: string): string | null {
  const cleaned = sanitizePhoneInput(raw).trim();
  if (!cleaned) return "Contact phone is required";

  const digits = cleaned.replace(/\D/g, "");
  if (digits.length > 13) return "Phone number must not exceed 13 digits";
  if (!digits.startsWith("264")) return "Phone number must start with +264";

  return null;
}

function formatCompanyUsers(company: Company | null): { text: string; title?: string } {
  if (!company) return { text: "—" };

  const namesRaw = (company.user_names ?? "").trim();
  if (!namesRaw) {
    const c = company.user_count;
    if (c === null || c === undefined || String(c).trim() === "") return { text: "—" };
    return { text: String(c) };
  }

  const names = namesRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (names.length <= 3) return { text: names.join(", "), title: names.join(", ") };
  return {
    text: `${names.slice(0, 3).join(", ")} +${names.length - 3} more`,
    title: names.join(", "),
  };
}

function getCompanyUserNames(company: Company | null): string[] {
  if (!company) return [];
  const namesRaw = (company.user_names ?? "").trim();
  if (!namesRaw) return [];
  return namesRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function resolveCompanyCreatedBy(company: Company): string {
  const byName = String((company as any).created_by_name ?? (company as any).creator_name ?? "").trim();
  if (byName) return byName;

  const byEmail = String((company as any).created_by_email ?? (company as any).creator_email ?? "").trim();
  if (byEmail) return byEmail;

  const byId = String(company.created_by ?? "").trim();
  if (byId) return byId;

  return "—";
}

function displayUser(u: UserSearchResult): string {
  const name = (u.name ?? "").trim();
  if (name) return name;
  return (u.email ?? "").trim() || "User";
}

export function CompaniesPage() {
  const { accessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const canPostJob = hasPermission("CREATE_JOB", "MANAGE_USERS");
  const canViewJobs = hasPermission("VIEW_JOB", "MANAGE_USERS");
  const canApproveCompany = hasPermission("APPROVE_COMPANY", "MANAGE_USERS");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesPage, setCompaniesPage] = useState(1);
  const [search, setSearch] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<CompanyUpsertPayload>(EMPTY_COMPANY);
  const [addFieldErrors, setAddFieldErrors] = useState<Record<string, string>>({});
  const [industryFocused, setIndustryFocused] = useState(false);
  const [assignQuery, setAssignQuery] = useState("");
  const [assignResults, setAssignResults] = useState<UserSearchResult[]>([]);
  const [assignSelected, setAssignSelected] = useState<UserSearchResult[]>([]);
  const [assignSearching, setAssignSearching] = useState(false);

  const [editAssignQuery, setEditAssignQuery] = useState("");
  const [editAssignResults, setEditAssignResults] = useState<UserSearchResult[]>([]);
  const [editAssignSelected, setEditAssignSelected] = useState<UserSearchResult[]>([]);
  const [editAssignSearching, setEditAssignSearching] = useState(false);
  const [editAssignedUsers, setEditAssignedUsers] = useState<UserSearchResult[]>([]);
  const [editAssignedLoading, setEditAssignedLoading] = useState(false);

  const [openCompanyId, setOpenCompanyId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelModeExtended>("view");
  const [editForm, setEditForm] = useState<CompanyUpsertPayload>(EMPTY_COMPANY);

  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null);
  const [usersModalCompany, setUsersModalCompany] = useState<Company | null>(null);
  const [postJobCompany, setPostJobCompany] = useState<Company | null>(null);
  const [postJobForm, setPostJobForm] = useState<CompanyJobFormState>(EMPTY_COMPANY_JOB_FORM);
  const [postJobErrors, setPostJobErrors] = useState<Record<string, string>>({});
  const [jobCategories, setJobCategories] = useState<JobCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const openCompany = useMemo(
    () => companies.find((c) => c.id === openCompanyId) ?? null,
    [companies, openCompanyId],
  );

  const filteredCompanies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((company) => {
      const name = String(company.name ?? "").toLowerCase();
      const industry = String(company.industry ?? "").toLowerCase();
      const city = String(company.city ?? "").toLowerCase();
      const country = String(company.country ?? "").toLowerCase();
      const createdBy = resolveCompanyCreatedBy(company).toLowerCase();
      return name.includes(q) || industry.includes(q) || city.includes(q) || country.includes(q) || createdBy.includes(q);
    });
  }, [companies, search]);

  const companiesPagination = useMemo(() => {
    const total = filteredCompanies.length;
    const pages = Math.max(1, Math.ceil(total / COMPANY_PAGE_LIMIT));
    const page = Math.min(companiesPage, pages);
    return { page, limit: COMPANY_PAGE_LIMIT, total, pages };
  }, [filteredCompanies.length, companiesPage]);

  const visibleCompanies = useMemo(() => {
    const start = (companiesPagination.page - 1) * COMPANY_PAGE_LIMIT;
    return filteredCompanies.slice(start, start + COMPANY_PAGE_LIMIT);
  }, [filteredCompanies, companiesPagination.page]);

  const companyStats = useMemo(() => {
    const total = filteredCompanies.length;
    let pending = 0;
    let approved = 0;
    let deactivated = 0;
    let totalUsers = 0;

    for (const c of filteredCompanies) {
      const status = String(c.status ?? "").trim().toLowerCase();
      if (status === "pending") pending += 1;
      else if (status === "deactivated") deactivated += 1;
      else if (status === "active" || status === "approved") approved += 1;

      const ucRaw = c.user_count;
      const asNum = typeof ucRaw === "number" ? ucRaw : Number(String(ucRaw ?? "").trim());
      if (Number.isFinite(asNum)) totalUsers += asNum;
    }

    return [
      { label: "Total Companies", value: total },
      { label: "Pending", value: pending },
      { label: "Approved", value: approved },
      { label: "Deactivated", value: deactivated },
      { label: "Users", value: totalUsers },
    ];
  }, [filteredCompanies]);

  useEffect(() => {
    if (companiesPage > companiesPagination.pages) {
      setCompaniesPage(companiesPagination.pages);
    }
  }, [companiesPage, companiesPagination.pages]);

  const industryMatches = useMemo(() => {
    const q = (addForm.industry ?? "").trim().toLowerCase();
    if (!q) return [] as string[];
    return INDUSTRY_SUGGESTIONS.filter((v) => v.toLowerCase().includes(q)).slice(0, 8);
  }, [addForm.industry]);

  const selectedCategory = useMemo(
    () => jobCategories.find((cat) => cat.id === postJobForm.category_id) ?? null,
    [jobCategories, postJobForm.category_id],
  );
  const availableSubcategories = selectedCategory?.subcategories ?? [];

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      setError(null);
      const list = await listCompanies(accessToken);
      setCompanies(list);
    } catch (e) {
      setError((e as any)?.message ?? "Failed to load companies");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!accessToken || !postJobCompany) return;
    let cancelled = false;
    setLoadingCategories(true);
    void listJobCategories(accessToken)
      .then((res) => {
        if (cancelled) return;
        setJobCategories(Array.isArray(res.categories) ? res.categories : []);
      })
      .catch(() => {
        if (cancelled) return;
        setJobCategories([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingCategories(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, postJobCompany]);

  useEffect(() => {
    if (!postJobForm.subcategory) return;
    if (availableSubcategories.some((s) => s.name === postJobForm.subcategory)) return;
    setPostJobForm((prev) => ({ ...prev, subcategory: "" }));
  }, [availableSubcategories, postJobForm.subcategory]);

  useEffect(() => {
    if (!accessToken) return;

    const q = (assignQuery.split(",").pop() ?? "").trim();
    if (q.length < 2) {
      setAssignResults([]);
      setAssignSearching(false);
      return;
    }

    let cancelled = false;
    setAssignSearching(true);

    const handle = window.setTimeout(async () => {
      try {
        const results = await searchUsers(accessToken, q);
        if (cancelled) return;
        const selectedIds = new Set(assignSelected.map((u) => u.id));
        setAssignResults(results.filter((u) => !selectedIds.has(u.id)));
      } catch {
        if (cancelled) return;
        setAssignResults([]);
      } finally {
        if (cancelled) return;
        setAssignSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [accessToken, assignQuery, assignSelected]);

  useEffect(() => {
    if (!accessToken) return;

    const q = (editAssignQuery.split(",").pop() ?? "").trim();
    if (q.length < 2) {
      setEditAssignResults([]);
      setEditAssignSearching(false);
      return;
    }

    let cancelled = false;
    setEditAssignSearching(true);

    const handle = window.setTimeout(async () => {
      try {
        const results = await searchUsers(accessToken, q);
        if (cancelled) return;
        const excludedIds = new Set([...editAssignSelected, ...editAssignedUsers].map((u) => u.id));
        setEditAssignResults(results.filter((u) => !excludedIds.has(u.id)));
      } catch {
        if (cancelled) return;
        setEditAssignResults([]);
      } finally {
        if (cancelled) return;
        setEditAssignSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [accessToken, editAssignQuery, editAssignSelected, editAssignedUsers]);

  useEffect(() => {
    if (!accessToken) return;
    if (panelMode !== "edit") return;
    if (!openCompanyId) return;

    let cancelled = false;
    setEditAssignedLoading(true);
    void getCompanyUsers(accessToken, openCompanyId)
      .then((users) => {
        if (cancelled) return;
        setEditAssignedUsers(users);
      })
      .catch(() => {
        if (cancelled) return;
        setEditAssignedUsers([]);
      })
      .finally(() => {
        if (cancelled) return;
        setEditAssignedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, openCompanyId, panelMode]);

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  function openPostJobModal(company: Company) {
    clearMessages();
    setAddOpen(false);
    setOpenCompanyId(company.id);
    setPanelMode("post-job");
    setPostJobCompany(company);
    setPostJobForm({
      ...EMPTY_COMPANY_JOB_FORM,
      location: [company.city, company.country].filter(Boolean).join(", "),
    });
    setPostJobErrors({});
  }

  function closePostJobModal() {
    setPostJobCompany(null);
    setPostJobForm(EMPTY_COMPANY_JOB_FORM);
    setPostJobErrors({});
    setPanelMode("view");
    setOpenCompanyId(null);
  }

  async function onSubmitPostJob() {
    if (!accessToken || !postJobCompany) return;
    const errs: Record<string, string> = {};
    if (!postJobForm.title.trim()) errs.title = "Job title is required";
    const plainDescription = richTextToPlainText(postJobForm.description).trim();
    if (!plainDescription) errs.description = "Description is required";
    if (!postJobForm.category_id) errs.category_id = "Category is required";
    if (!postJobForm.subcategory) errs.subcategory = "Subcategory is required";
    if (!postJobForm.salary_min.trim()) errs.salary_min = "Minimum salary is required";
    if (!postJobForm.salary_max.trim()) errs.salary_max = "Maximum salary is required";
    if (!postJobForm.location.trim()) errs.location = "Location is required";
    if (!postJobForm.application_deadline) errs.application_deadline = "Application deadline is required";
    setPostJobErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const categoryName = selectedCategory?.name ?? "";
    try {
      setSaving(true);
      clearMessages();
      await createJob(accessToken, {
        title: postJobForm.title.trim(),
        description: normalizeRichTextForSave(postJobForm.description) || plainDescription,
        company: postJobCompany.name,
        company_id: postJobCompany.id,
        category: categoryName,
        subcategory: postJobForm.subcategory,
        location: postJobForm.location.trim(),
        salary_min: Number(postJobForm.salary_min),
        salary_max: Number(postJobForm.salary_max),
        salary_currency: "NAD",
        employment_type: postJobForm.employment_type,
        experience_level: "Entry",
        remote: postJobForm.remote,
        requirements: [],
        responsibilities: [],
        benefits: [],
        application_deadline: postJobForm.application_deadline,
        status: postJobForm.status,
      });
      setSuccess("Job posted successfully");
      closePostJobModal();
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to post job");
    } finally {
      setSaving(false);
    }
  }

  function clearAddFieldError(key: string) {
    setAddFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function startView(company: Company) {
    clearMessages();
    setAddOpen(false);
    setOpenCompanyId(company.id);
    setPanelMode("view");
    setPostJobCompany(null);
    setPostJobErrors({});

    setEditForm({
      name: toText(company.name),
      industry: toText(company.industry),
      description: toText(company.description),
      website: toText(company.website),
      logoFile: null,
      contact_email: toText(company.contact_email),
      contact_phone: toText(company.contact_phone),
      address_line1: toText(company.address_line1),
      address_line2: toText(company.address_line2),
      city: toText(company.city),
      country: toText(company.country),
    });
  }

  function startEdit(company: Company) {
    clearMessages();
    setAddOpen(false);
    setOpenCompanyId(company.id);
    setPanelMode("edit");
    setPostJobCompany(null);
    setPostJobErrors({});

    setEditAssignQuery("");
    setEditAssignResults([]);
    setEditAssignSelected([]);
    setEditAssignSearching(false);
    setEditAssignedUsers([]);
    setEditAssignedLoading(false);

    setEditForm({
      name: toText(company.name),
      industry: toText(company.industry),
      description: toText(company.description),
      website: toText(company.website),
      logoFile: null,
      contact_email: toText(company.contact_email),
      contact_phone: toText(company.contact_phone),
      address_line1: toText(company.address_line1),
      address_line2: toText(company.address_line2),
      city: toText(company.city),
      country: toText(company.country),
    });
  }

  async function onAddCompany() {
    if (!accessToken) return;
    try {
      clearMessages();
      setSaving(true);

      const errs: Record<string, string> = {};
      if (!addForm.name.trim()) errs.name = "Company name is required";
      if (!(addForm.industry ?? "").trim()) errs.industry = "Industry is required";
      if (!(addForm.description ?? "").trim()) errs.description = "Description is required";
      if (!addForm.logoFile) errs.logo = "Company logo is required";
      if (!(addForm.contact_email ?? "").trim()) errs.contact_email = "Contact email is required";
      const phoneErr = validateNamibiaPhone(addForm.contact_phone ?? "");
      if (phoneErr) errs.contact_phone = phoneErr;
      if (!(addForm.address_line1 ?? "").trim()) errs.address_line1 = "Address line 1 is required";
      if (!(addForm.address_line2 ?? "").trim()) errs.address_line2 = "Address line 2 is required";
      if (!(addForm.city ?? "").trim()) errs.city = "City is required";
      if (!(addForm.country ?? "").trim()) errs.country = "Country is required";
      if (assignSelected.length === 0) errs.assign_users = "Assign at least one user";

      setAddFieldErrors(errs);
      if (Object.keys(errs).length > 0) return;

      const payload = normalizePayload(addForm);

      const created = await createCompany(accessToken, payload);

      const ids = assignSelected.map((u) => u.id);

      if (ids.length > 0) {
        const results = await Promise.allSettled(
          ids.map((id) => addUserToCompany(accessToken, created.id, id)),
        );
        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed > 0) {
          setSuccess(
            `Company added. ${failed} user assignment${failed === 1 ? "" : "s"} failed.`,
          );
        } else {
          setSuccess("Company added successfully");
        }
      } else {
        setSuccess("Company added successfully");
      }

      setAddForm(EMPTY_COMPANY);
      setAddFieldErrors({});
      setAssignQuery("");
      setAssignResults([]);
      setAssignSelected([]);
      setAddOpen(false);

      setCompanies((prev) => [created, ...prev]);
    } catch (e) {
      setError((e as any)?.message ?? "Failed to add company");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveEdit() {
    if (!accessToken) return;
    if (!openCompanyId) return;

    try {
      clearMessages();
      setSaving(true);
      const payload = normalizePayload(editForm);
      if (!payload.name) {
        setError("Company name is required");
        return;
      }

      const updated = await updateCompany(accessToken, openCompanyId, payload);

      const assignedIdSet = new Set(editAssignedUsers.map((u) => u.id));
      const idsToAssign = editAssignSelected.map((u) => u.id).filter((id) => !assignedIdSet.has(id));
      if (idsToAssign.length > 0) {
        const results = await Promise.allSettled(
          idsToAssign.map((id) => addUserToCompany(accessToken, openCompanyId, id)),
        );
        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed > 0) {
          setSuccess(`Company updated. ${failed} user assignment${failed === 1 ? "" : "s"} failed.`);
        } else {
          setSuccess("Company updated successfully");
        }
      } else {
        setSuccess("Company updated successfully");
      }

      setEditAssignQuery("");
      setEditAssignResults([]);
      setEditAssignSelected([]);

      setCompanies((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
      setPanelMode("view");
    } catch (e) {
      setError((e as any)?.message ?? "Failed to update company");
    } finally {
      setSaving(false);
    }
  }

  async function onConfirmDeactivate() {
    if (!accessToken) return;
    if (!confirmDeactivateId) return;

    try {
      clearMessages();
      setSaving(true);
      const id = confirmDeactivateId;
      const updated = await deactivateCompany(accessToken, id);
      setSuccess("Company deactivated successfully");
      setConfirmDeactivateId(null);

      setCompanies((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, ...updated, status: updated.status ?? "deactivated" } : c,
        ),
      );
    } catch (e) {
      setError((e as any)?.message ?? "Failed to deactivate company");
    } finally {
      setSaving(false);
    }
  }

  async function onActivateCompany(id: string) {
    if (!accessToken) return;
    try {
      clearMessages();
      setSaving(true);
      const updated = await reactivateCompany(accessToken, id);
      setSuccess("Company activated successfully");
      setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
    } catch (e) {
      setError((e as any)?.message ?? "Failed to activate company");
    } finally {
      setSaving(false);
    }
  }

  async function onApproveCompany(id: string) {
    if (!accessToken) return;
    try {
      clearMessages();
      setSaving(true);
      const updated = await approveCompany(accessToken, id);
      setSuccess("Company approved successfully");
      setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
    } catch (e) {
      setError((e as any)?.message ?? "Failed to approve company");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="companiesHeader">
          <h1 className="pageTitle">Companies</h1>
        </div>
        <p className="pageText">Loading…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="companiesHeader">
        <h1 className="pageTitle">Companies</h1>

        <button
          type="button"
          className="btn btnGhost btnSm stepperSaveBtn"
          onClick={() => {
            clearMessages();
            setOpenCompanyId(null);
            setAddOpen((v) => !v);
          }}
          disabled={saving}
        >
          {addOpen ? "Cancel" : "Add Company"}
        </button>
      </div>

      {error && <div className="errorBox">{error}</div>}
      {success && <div className="successBox">{success}</div>}

      <div className="statsCardsGrid" role="region" aria-label="Company statistics">
        {companyStats.map((c, idx) => {
          const toneClass = idx % 2 === 0 ? "jobCardToneA" : "jobCardToneB";
          return (
            <div key={c.label} className={`dashCard statsCard ${toneClass}`}>
              <div className="readLabel">{c.label}</div>
              <div className="statsCardValue">{c.value}</div>
            </div>
          );
        })}
      </div>

      {addOpen && (
        <div className="dropPanel" role="region" aria-label="Add company">
          <div className="editForm">
            <h2 className="editFormTitle">Add Company</h2>

            <div className="editGrid">
              <div className="field">
                <label className="fieldLabel">Company Name *</label>
                <input
                  className="input"
                  value={addForm.name}
                  onChange={(e) => {
                    clearAddFieldError("name");
                    setAddForm((p) => ({ ...p, name: e.target.value }));
                  }}
                  placeholder="Company name"
                  required
                />
                {addFieldErrors.name && <span className="fieldError">{addFieldErrors.name}</span>}
              </div>

              <div className="field">
                <label className="fieldLabel">Industry *</label>
                <input
                  className="input"
                  value={addForm.industry}
                  onChange={(e) => {
                    clearAddFieldError("industry");
                    setAddForm((p) => ({ ...p, industry: e.target.value }));
                  }}
                  onFocus={() => setIndustryFocused(true)}
                  onBlur={() => {
                    // Defer so clicks on suggestions can run first.
                    window.setTimeout(() => setIndustryFocused(false), 0);
                  }}
                  placeholder="Industry"
                  required
                />
                {addFieldErrors.industry && <span className="fieldError">{addFieldErrors.industry}</span>}

                {industryFocused && industryMatches.length > 0 && (
                  <div className="typeaheadList" role="listbox" aria-label="Industry suggestions">
                    {industryMatches.map((v) => (
                      <button
                        key={v}
                        type="button"
                        className="actionMenuItem"
                        role="option"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          clearAddFieldError("industry");
                          setAddForm((p) => ({ ...p, industry: v }));
                        }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="field fieldFull">
                <label className="fieldLabel">Description *</label>
                <textarea
                  className="input textarea"
                  value={addForm.description}
                  onChange={(e) => {
                    clearAddFieldError("description");
                    setAddForm((p) => ({ ...p, description: e.target.value }));
                  }}
                  placeholder="Company description"
                  required
                />
                {addFieldErrors.description && (
                  <span className="fieldError">{addFieldErrors.description}</span>
                )}
              </div>

              <div className="field">
                <label className="fieldLabel">Website</label>
                <input
                  className="input"
                  value={addForm.website}
                  onChange={(e) => setAddForm((p) => ({ ...p, website: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="field">
                <label className="fieldLabel">Company Logo *</label>
                <input
                  className="input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    clearAddFieldError("logo");
                    const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
                    setAddForm((p) => ({ ...p, logoFile: file }));
                  }}
                  required
                />
                {addFieldErrors.logo && <span className="fieldError">{addFieldErrors.logo}</span>}
              </div>

              <div className="field">
                <label className="fieldLabel">Contact Email *</label>
                <input
                  className="input"
                  value={addForm.contact_email}
                  onChange={(e) => {
                    clearAddFieldError("contact_email");
                    setAddForm((p) => ({ ...p, contact_email: e.target.value }));
                  }}
                  placeholder="email@example.com"
                  required
                />
                {addFieldErrors.contact_email && (
                  <span className="fieldError">{addFieldErrors.contact_email}</span>
                )}
              </div>

              <div className="field">
                <label className="fieldLabel">Contact Phone *</label>
                <input
                  className="input"
                  type="tel"
                  inputMode="tel"
                  value={addForm.contact_phone}
                  onChange={(e) => {
                    clearAddFieldError("contact_phone");
                    const next = sanitizePhoneInput(e.target.value);
                    setAddForm((p) => ({ ...p, contact_phone: next }));
                  }}
                  placeholder="+264 81 123 4567 or +264 61 123 456"
                  required
                />
                {addFieldErrors.contact_phone && (
                  <span className="fieldError">{addFieldErrors.contact_phone}</span>
                )}
              </div>

              <div className="field">
                <label className="fieldLabel">Address Line 1 *</label>
                <input
                  className="input"
                  value={addForm.address_line1}
                  onChange={(e) => {
                    clearAddFieldError("address_line1");
                    setAddForm((p) => ({ ...p, address_line1: e.target.value }));
                  }}
                  placeholder="Address line 1"
                  required
                />
                {addFieldErrors.address_line1 && (
                  <span className="fieldError">{addFieldErrors.address_line1}</span>
                )}
              </div>

              <div className="field">
                <label className="fieldLabel">Address Line 2 *</label>
                <input
                  className="input"
                  value={addForm.address_line2}
                  onChange={(e) => {
                    clearAddFieldError("address_line2");
                    setAddForm((p) => ({ ...p, address_line2: e.target.value }));
                  }}
                  placeholder="Address line 2"
                  required
                />
                {addFieldErrors.address_line2 && (
                  <span className="fieldError">{addFieldErrors.address_line2}</span>
                )}
              </div>

              <div className="field">
                <label className="fieldLabel">City *</label>
                <input
                  className="input"
                  value={addForm.city}
                  onChange={(e) => {
                    clearAddFieldError("city");
                    setAddForm((p) => ({ ...p, city: e.target.value }));
                  }}
                  placeholder="City"
                  required
                />
                {addFieldErrors.city && <span className="fieldError">{addFieldErrors.city}</span>}
              </div>

              <div className="field">
                <label className="fieldLabel">Country *</label>
                <input
                  className="input"
                  value={addForm.country}
                  onChange={(e) => {
                    clearAddFieldError("country");
                    setAddForm((p) => ({ ...p, country: e.target.value }));
                  }}
                  placeholder="Country"
                  required
                />
                {addFieldErrors.country && <span className="fieldError">{addFieldErrors.country}</span>}
              </div>

              <div className="field fieldFull">
                <label className="fieldLabel">Assign Users (comma separated) *</label>
                <input
                  className="input"
                  value={assignSelected.length > 0 ? `${assignSelected.map(displayUser).join(", ")}, ${assignQuery}` : assignQuery}
                  onChange={(e) => {
                    clearAddFieldError("assign_users");
                    const selectedPrefix = assignSelected.length > 0 ? `${assignSelected.map(displayUser).join(", ")}, ` : "";
                    const next = e.target.value;
                    if (selectedPrefix && next.startsWith(selectedPrefix)) {
                      setAssignQuery(next.slice(selectedPrefix.length));
                    } else {
                      // Best-effort: treat whatever is after the last comma as the active query.
                      const parts = next.split(",");
                      setAssignQuery((parts[parts.length - 1] ?? "").trimStart());
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "," && e.key !== "Enter") return;
                    if (assignResults.length !== 1) return;
                    e.preventDefault();
                    const u = assignResults[0];
                    clearAddFieldError("assign_users");
                    setAssignSelected((prev) => (prev.some((x) => x.id === u.id) ? prev : [...prev, u]));
                    setAssignQuery("");
                    setAssignResults([]);
                  }}
                  placeholder="Type a name or email…"
                  autoComplete="off"
                />

                {addFieldErrors.assign_users && (
                  <span className="fieldError">{addFieldErrors.assign_users}</span>
                )}

                {assignSearching && (
                  <div className="confirmLabel" style={{ marginTop: 6 }}>
                    Searching…
                  </div>
                )}

                {assignResults.length > 0 && (
                  <div
                    className="typeaheadList"
                    role="listbox"
                    aria-label="User suggestions"
                  >
                    {assignResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className="actionMenuItem"
                        onClick={() => {
                          clearAddFieldError("assign_users");
                          setAssignSelected((prev) => (prev.some((x) => x.id === u.id) ? prev : [...prev, u]));
                          setAssignQuery("");
                          setAssignResults([]);
                        }}
                        role="option"
                      >
                        {(u.name || "(No name)") + (u.email ? ` — ${u.email}` : "")}
                      </button>
                    ))}
                  </div>
                )}

                {assignSelected.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {assignSelected.map((u) => (
                      <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="chipBadge">{displayUser(u)}</span>
                        <button
                          type="button"
                          className="btn btnGhost btnSm"
                          onClick={() => {
                            setAssignSelected((prev) => prev.filter((x) => x.id !== u.id));
                          }}
                          disabled={saving}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="stepperActions">
              <button
                className="btn btnGhost btnSm stepperSaveBtn"
                onClick={onAddCompany}
                disabled={saving}
                type="button"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 260, flex: "1 1 340px" }}>
          <label className="fieldLabel">Search</label>
          <input
            className="input"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCompaniesPage(1);
            }}
            placeholder="Search name/industry/city/country/creator..."
          />
        </div>

        <div className="publicJobsPager" role="navigation" aria-label="Companies pagination top">
          <button
            className="btn btnPrimary btnSm"
            style={{ background: "var(--menu-icon)", borderColor: "var(--menu-icon)" }}
            type="button"
            onClick={() => setCompaniesPage((p) => Math.max(1, p - 1))}
            disabled={companiesPagination.page <= 1 || saving}
          >
            {"<-"} Previous
          </button>
          <span className="publicJobsPagerInfo">
            Page {companiesPagination.page} of {companiesPagination.pages} ({companiesPagination.total} companies)
          </span>
          <button
            className="btn btnPrimary btnSm"
            style={{ background: "var(--menu-icon-active)", borderColor: "var(--menu-icon-active)" }}
            type="button"
            onClick={() => setCompaniesPage((p) => Math.min(companiesPagination.pages, p + 1))}
            disabled={companiesPagination.page >= companiesPagination.pages || saving}
          >
            Next {"->"}
          </button>
        </div>
      </div>

      <div className="jobCardsGrid" role="region" aria-label="Companies cards">
        {visibleCompanies.length === 0 ? (
          <div className="dashCard jobCardsGridItem jobCardToneA"><div className="emptyState">No companies found.</div></div>
        ) : (
          visibleCompanies.map((c, idx) => {
            const isOpen = openCompanyId === c.id;
            const status = String(c.status ?? "").trim();
            const normalizedStatus = status.toLowerCase();
            const isPending = normalizedStatus === "pending";
            const isApproved = normalizedStatus === "active" || normalizedStatus === "approved";
            const isDeactivated = normalizedStatus === "deactivated";
            const usersMeta = formatCompanyUsers(c);
            const userNames = getCompanyUserNames(c);
            const toneClass = idx % 2 === 0 ? "jobCardToneA" : "jobCardToneB";

            return (
              <article key={c.id} className={`dashCard jobCardsGridItem ${toneClass}`}>
                <div className="dashCardHeader" style={{ marginBottom: 6 }}>
                  <div>
                    <h2 className="dashCardTitle" style={{ fontSize: 15 }}>{c.name}</h2>
                  </div>
                  {status ? (
                    <span
                      className="chipBadge"
                      style={
                        isPending
                          ? { background: "#fef3c7", color: "#92400e" }
                          : isApproved
                            ? { background: "#dcfce7", color: "#166534" }
                            : undefined
                      }
                    >
                      {isPending ? "Pending" : isApproved ? "Approved" : status}
                    </span>
                  ) : null}
                </div>

                <div className="profileReadGrid" style={{ marginTop: 6 }}>
                  <ReadField label="Industry" value={c.industry ?? "—"} />
                  <ReadField label="City" value={c.city ?? "—"} />
                  <ReadField label="Country" value={c.country ?? "—"} />
                  <ReadField label="Created By" value={resolveCompanyCreatedBy(c)} />
                  <ReadField label="Users" value={usersMeta.text || "—"} />
                </div>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btnGhost btnSm"
                    disabled={saving}
                    onClick={() => {
                      if (isOpen && panelMode === "view") setOpenCompanyId(null);
                      else startView(c);
                    }}
                  >
                    {isOpen && panelMode === "view" ? "Close" : "View"}
                  </button>
                  <button
                    type="button"
                    className="btn btnGhost btnSm"
                    disabled={saving}
                    onClick={() => {
                      if (isOpen && panelMode === "edit") setOpenCompanyId(null);
                      else startEdit(c);
                    }}
                  >
                    {isOpen && panelMode === "edit" ? "Close" : "Edit"}
                  </button>
                  <button
                    type="button"
                    className="btn btnGhost btnSm"
                    disabled={saving}
                    onClick={() => {
                      if (isDeactivated) onActivateCompany(c.id);
                      else {
                        clearMessages();
                        setConfirmDeactivateId(c.id);
                      }
                    }}
                  >
                    {isDeactivated ? "Activate" : "Deactivate"}
                  </button>
                  {userNames.length > 0 ? (
                    <button
                      type="button"
                      className="btn btnGhost btnSm"
                      disabled={saving}
                      onClick={() => setUsersModalCompany(c)}
                      title={usersMeta.title}
                    >
                      View Users ({userNames.length})
                    </button>
                  ) : null}
                  {canPostJob ? (
                    <button
                      type="button"
                      className="btn btnGhost btnSm"
                      disabled={saving}
                      onClick={() => {
                        if (isOpen && panelMode === "post-job") {
                          closePostJobModal();
                        } else {
                          openPostJobModal(c);
                        }
                      }}
                    >
                      {isOpen && panelMode === "post-job" ? "Close" : "Post Job"}
                    </button>
                  ) : null}
                  {canApproveCompany && isPending ? (
                    <button
                      type="button"
                      className="btn btnGhost btnSm stepperSaveBtn"
                      disabled={saving}
                      onClick={() => onApproveCompany(c.id)}
                    >
                      Approve
                    </button>
                  ) : null}
                  {canViewJobs ? (
                    <button
                      type="button"
                      className="btn btnGhost btnSm"
                      disabled={saving}
                      onClick={() => navigate(`/app/jobs?company_id=${encodeURIComponent(c.id)}`)}
                    >
                      View Jobs
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btnGhost btnSm"
                    disabled={saving}
                    onClick={() => navigate(`/app/audit?target_type=company&target_id=${encodeURIComponent(c.id)}`)}
                  >
                    Audit
                  </button>
                </div>

                {isOpen ? (
                  <div className="dropPanel" style={{ marginTop: 12 }}>
                    {panelMode === "view" ? (
                      <CompanyViewPanel company={openCompany} />
                    ) : panelMode === "edit" ? (
                      <CompanyEditPanel
                        company={openCompany}
                        form={editForm}
                        onChange={setEditForm}
                        assignedUsers={editAssignedUsers}
                        assignedUsersLoading={editAssignedLoading}
                        assignQuery={editAssignQuery}
                        assignResults={editAssignResults}
                        assignSelected={editAssignSelected}
                        assignSearching={editAssignSearching}
                        onAssignQueryChange={setEditAssignQuery}
                        onAssignPick={(u) => {
                          setEditAssignSelected((prev) => (prev.some((x) => x.id === u.id) ? prev : [...prev, u]));
                          setEditAssignQuery("");
                          setEditAssignResults([]);
                        }}
                        onAssignRemove={(id) => {
                          setEditAssignSelected((prev) => prev.filter((x) => x.id !== id));
                        }}
                        onCancel={() => {
                          setPanelMode("view");
                        }}
                        onSave={onSaveEdit}
                        saving={saving}
                      />
                    ) : (
                      <CompanyPostJobPanel
                        company={postJobCompany}
                        loadingCategories={loadingCategories}
                        categories={jobCategories}
                        availableSubcategories={availableSubcategories}
                        form={postJobForm}
                        errors={postJobErrors}
                        onChange={setPostJobForm}
                        onCancel={closePostJobModal}
                        onSave={onSubmitPostJob}
                        saving={saving}
                      />
                    )}
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      <div className="publicJobsPager" role="navigation" aria-label="Companies pagination" style={{ marginTop: 16 }}>
        <button
          className="btn btnPrimary btnSm"
          style={{ background: "var(--menu-icon)", borderColor: "var(--menu-icon)" }}
          type="button"
          onClick={() => setCompaniesPage((p) => Math.max(1, p - 1))}
          disabled={companiesPagination.page <= 1 || saving}
        >
          {"<-"} Previous
        </button>
        <span className="publicJobsPagerInfo">
          Page {companiesPagination.page} of {companiesPagination.pages} ({companiesPagination.total} companies)
        </span>
        <button
          className="btn btnPrimary btnSm"
          style={{ background: "var(--menu-icon-active)", borderColor: "var(--menu-icon-active)" }}
          type="button"
          onClick={() => setCompaniesPage((p) => Math.min(companiesPagination.pages, p + 1))}
          disabled={companiesPagination.page >= companiesPagination.pages || saving}
        >
          Next {"->"}
        </button>
      </div>



      <ConfirmModal
        open={Boolean(confirmDeactivateId)}
        title="Deactivate company"
        message="Are you sure you want to deactivate this company?"
        confirmLabel={saving ? "Deactivating…" : "Deactivate"}
        busy={saving}
        onCancel={() => setConfirmDeactivateId(null)}
        onConfirm={onConfirmDeactivate}
      />

      <UsersModal
        open={Boolean(usersModalCompany)}
        company={usersModalCompany}
        onClose={() => setUsersModalCompany(null)}
      />
    </div>
  );
}

function CompanyPostJobPanel({
  company,
  loadingCategories,
  categories,
  availableSubcategories,
  form,
  errors,
  onChange,
  onCancel,
  onSave,
  saving,
}: {
  company: Company | null;
  loadingCategories: boolean;
  categories: JobCategory[];
  availableSubcategories: JobCategory["subcategories"];
  form: CompanyJobFormState;
  errors: Record<string, string>;
  onChange: Dispatch<SetStateAction<CompanyJobFormState>>;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  if (!company) {
    return (
      <div className="editForm">
        <h2 className="editFormTitle">Post Job</h2>
        <p className="pageText">Select a company to post a job.</p>
      </div>
    );
  }

  return (
    <div className="editForm">
      <h2 className="editFormTitle">Post Job — {company.name}</h2>

      {loadingCategories ? (
        <p className="pageText">Loading categories...</p>
      ) : (
        <div className="editGrid">
          <div className="field">
            <label className="fieldLabel">Job Title *</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => onChange((prev) => ({ ...prev, title: e.target.value }))}
            />
            {errors.title && <span className="fieldError">{errors.title}</span>}
          </div>

          <div className="field">
            <label className="fieldLabel">Category *</label>
            <select
              className="input"
              value={form.category_id}
              onChange={(e) => onChange((prev) => ({ ...prev, category_id: e.target.value, subcategory: "" }))}
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.category_id && <span className="fieldError">{errors.category_id}</span>}
          </div>

          <div className="field">
            <label className="fieldLabel">Subcategory *</label>
            <select
              className="input"
              value={form.subcategory}
              onChange={(e) => onChange((prev) => ({ ...prev, subcategory: e.target.value }))}
              disabled={!form.category_id}
            >
              <option value="">Select subcategory</option>
              {availableSubcategories.map((sub) => (
                <option key={sub.id} value={sub.name}>
                  {sub.name}
                </option>
              ))}
            </select>
            {errors.subcategory && <span className="fieldError">{errors.subcategory}</span>}
          </div>

          <div className="field">
            <label className="fieldLabel">Employment Type *</label>
            <select
              className="input"
              value={form.employment_type}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  employment_type: e.target.value as JobUpsertPayload["employment_type"],
                }))
              }
            >
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </select>
          </div>

          <div className="field">
            <label className="fieldLabel">Salary Min *</label>
            <input
              className="input"
              type="number"
              value={form.salary_min}
              onChange={(e) => onChange((prev) => ({ ...prev, salary_min: e.target.value }))}
            />
            {errors.salary_min && <span className="fieldError">{errors.salary_min}</span>}
          </div>

          <div className="field">
            <label className="fieldLabel">Salary Max *</label>
            <input
              className="input"
              type="number"
              value={form.salary_max}
              onChange={(e) => onChange((prev) => ({ ...prev, salary_max: e.target.value }))}
            />
            {errors.salary_max && <span className="fieldError">{errors.salary_max}</span>}
          </div>

          <div className="field">
            <label className="fieldLabel">Location *</label>
            <input
              className="input"
              value={form.location}
              onChange={(e) => onChange((prev) => ({ ...prev, location: e.target.value }))}
            />
            {errors.location && <span className="fieldError">{errors.location}</span>}
          </div>

          <div className="field">
            <label className="fieldLabel">Application Deadline *</label>
            <input
              className="input"
              type="date"
              value={form.application_deadline}
              onChange={(e) => onChange((prev) => ({ ...prev, application_deadline: e.target.value }))}
            />
            {errors.application_deadline && <span className="fieldError">{errors.application_deadline}</span>}
          </div>

          <div className="field">
            <label className="fieldLabel">Status *</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) => onChange((prev) => ({ ...prev, status: e.target.value as "draft" | "pending" }))}
            >
              <option value="draft">DRAFT</option>
              <option value="pending">PENDING</option>
            </select>
          </div>

          <label className="field fieldCheckbox">
            <input
              type="checkbox"
              checked={form.remote}
              onChange={(e) => onChange((prev) => ({ ...prev, remote: e.target.checked }))}
            />
            <span className="fieldLabel">Is Remote</span>
          </label>

          <div className="field fieldFull">
            <label className="fieldLabel">Description *</label>
            <RichTextEditor
              value={form.description}
              onChange={(html) => onChange((prev) => ({ ...prev, description: html }))}
              disabled={saving}
              placeholder="Type job description…"
            />
            {errors.description && <span className="fieldError">{errors.description}</span>}
          </div>
        </div>
      )}

      <div className="modalActions">
        <button className="btn btnGhost" type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button
          className="btn btnGhost btnSm stepperSaveBtn"
          type="button"
          onClick={onSave}
          disabled={saving || loadingCategories}
        >
          {saving ? "Posting..." : "Post Job"}
        </button>
      </div>
    </div>
  );
}

function CompanyViewPanel({ company }: { company: Company | null }) {
  if (!company) return null;

  const users = formatCompanyUsers(company);
  const logoUrl = resolveCompanyLogoUrl(company);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
  }, [company.id, logoUrl]);

  return (
    <div className="editForm">
      <h2 className="editFormTitle">View Company</h2>

      <div className="profileReadGrid">
        <ReadField label="Company Name" value={company.name} />
        <ReadField label="Industry" value={company.industry} />
        <ReadField label="Website" value={company.website} />
        <div className="readField">
          <span className="readLabel">Company Logo</span>
          <span className="readValue">
            {logoUrl && !logoFailed ? (
              <img
                src={logoUrl}
                alt={`${company.name} logo`}
                style={{ maxWidth: "100%", height: 44, objectFit: "contain", display: "block" }}
                onError={() => setLogoFailed(true)}
              />
            ) : (
              "—"
            )}
          </span>
        </div>
        <ReadField label="Contact Email" value={company.contact_email} />
        <ReadField label="Contact Phone" value={company.contact_phone} />
        <ReadField label="Address Line 1" value={company.address_line1} />
        <ReadField label="Address Line 2" value={company.address_line2} />
        <ReadField label="City" value={company.city} />
        <ReadField label="Country" value={company.country} />
        <ReadField label="Created By" value={company.created_by_name} />
        <ReadField label="Users" value={users.title ?? users.text} />
        <ReadField label="Status" value={company.status} />
        <ReadFieldFull label="Description" value={company.description} />
      </div>
    </div>
  );
}

function CompanyEditPanel({
  company,
  form,
  onChange,
  assignedUsers,
  assignedUsersLoading,
  assignQuery,
  assignResults,
  assignSelected,
  assignSearching,
  onAssignQueryChange,
  onAssignPick,
  onAssignRemove,
  onCancel,
  onSave,
  saving,
}: {
  company: Company | null;
  form: CompanyUpsertPayload;
  onChange: (v: CompanyUpsertPayload) => void;
  assignedUsers: UserSearchResult[];
  assignedUsersLoading: boolean;
  assignQuery: string;
  assignResults: UserSearchResult[];
  assignSelected: UserSearchResult[];
  assignSearching: boolean;
  onAssignQueryChange: (v: string) => void;
  onAssignPick: (u: UserSearchResult) => void;
  onAssignRemove: (id: string) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const existingLogoUrl = company ? resolveCompanyLogoUrl(company) : "";
  const [existingLogoFailed, setExistingLogoFailed] = useState(false);

  useEffect(() => {
    setExistingLogoFailed(false);
  }, [company?.id, existingLogoUrl]);

  return (
    <div className="editForm">
      <h2 className="editFormTitle">Edit Company</h2>

      <div className="editGrid">
        <div className="field">
          <label className="fieldLabel">Company Name *</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
          />
        </div>

        <div className="field">
          <label className="fieldLabel">Industry</label>
          <input
            className="input"
            list="industryOptions"
            value={form.industry ?? ""}
            onChange={(e) => onChange({ ...form, industry: e.target.value })}
          />
        </div>

        <div className="field fieldFull">
          <label className="fieldLabel">Description</label>
          <textarea
            className="input textarea"
            value={form.description ?? ""}
            onChange={(e) => onChange({ ...form, description: e.target.value })}
          />
        </div>

        <div className="field">
          <label className="fieldLabel">Website</label>
          <input
            className="input"
            value={form.website ?? ""}
            onChange={(e) => onChange({ ...form, website: e.target.value })}
          />
        </div>

        <div className="field">
          <label className="fieldLabel">Company Logo</label>
          {existingLogoUrl && !existingLogoFailed ? (
            <div style={{ marginBottom: 10 }}>
              <img
                src={existingLogoUrl}
                alt="Current company logo"
                style={{ maxWidth: "100%", height: 56, objectFit: "contain", display: "block" }}
                onError={() => setExistingLogoFailed(true)}
              />
            </div>
          ) : null}
          <input
            className="input"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
              onChange({ ...form, logoFile: file });
            }}
            disabled={saving}
          />
          <p className="pageText">Leave empty to keep the current logo.</p>
        </div>

        <div className="field">
          <label className="fieldLabel">Contact Email</label>
          <input
            className="input"
            value={form.contact_email ?? ""}
            onChange={(e) => onChange({ ...form, contact_email: e.target.value })}
          />
        </div>

        <div className="field fieldFull">
          <label className="fieldLabel">Assign Users (comma separated) *</label>

          {assignedUsersLoading ? (
            <div className="confirmLabel" style={{ marginBottom: 8 }}>
              Loading assigned users…
            </div>
          ) : assignedUsers.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              {assignedUsers.map((u) => (
                <span key={u.id} className="chip" title={u.email || undefined}>
                  {displayUser(u)}
                </span>
              ))}
            </div>
          ) : null}

          <input
            className="input"
            value={assignSelected.length > 0 ? `${assignSelected.map(displayUser).join(", ")}, ${assignQuery}` : assignQuery}
            onChange={(e) => {
              const selectedPrefix = assignSelected.length > 0 ? `${assignSelected.map(displayUser).join(", ")}, ` : "";
              const next = e.target.value;
              if (selectedPrefix && next.startsWith(selectedPrefix)) {
                onAssignQueryChange(next.slice(selectedPrefix.length));
              } else {
                const parts = next.split(",");
                onAssignQueryChange((parts[parts.length - 1] ?? "").trimStart());
              }
            }}
            onKeyDown={(e) => {
              if (e.key !== "," && e.key !== "Enter") return;
              if (assignResults.length !== 1) return;
              e.preventDefault();
              onAssignPick(assignResults[0]);
            }}
            placeholder="Type a name or email…"
            autoComplete="off"
            disabled={saving}
          />

          {assignSearching && (
            <div className="confirmLabel" style={{ marginTop: 6 }}>
              Searching…
            </div>
          )}

          {assignResults.length > 0 && (
            <div className="typeaheadList" role="listbox" aria-label="User suggestions">
              {assignResults.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="typeaheadItem"
                  onClick={() => onAssignPick(u)}
                  disabled={saving}
                >
                  <span style={{ fontWeight: 700 }}>{displayUser(u)}</span>
                  {u.email ? <span className="pageText" style={{ margin: 0 }}>{u.email}</span> : null}
                </button>
              ))}
            </div>
          )}

          {assignSelected.length > 0 && (
            <div className="selectedUserChips" style={{ marginTop: 8 }}>
              {assignSelected.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="chip"
                  onClick={() => onAssignRemove(u.id)}
                  disabled={saving}
                  title="Remove"
                >
                  {displayUser(u)} ×
                </button>
              ))}
            </div>
          )}

          <p className="pageText">
            Adds additional users to this company.
          </p>
        </div>

        <div className="field">
          <label className="fieldLabel">Contact Phone</label>
          <input
            className="input"
            type="tel"
            inputMode="tel"
            value={form.contact_phone ?? ""}
            onChange={(e) => onChange({ ...form, contact_phone: sanitizePhoneInput(e.target.value) })}
          />
        </div>

        <div className="field">
          <label className="fieldLabel">Address Line 1</label>
          <input
            className="input"
            value={form.address_line1 ?? ""}
            onChange={(e) => onChange({ ...form, address_line1: e.target.value })}
          />
        </div>

        <div className="field">
          <label className="fieldLabel">Address Line 2</label>
          <input
            className="input"
            value={form.address_line2 ?? ""}
            onChange={(e) => onChange({ ...form, address_line2: e.target.value })}
          />
        </div>

        <div className="field">
          <label className="fieldLabel">City</label>
          <input
            className="input"
            value={form.city ?? ""}
            onChange={(e) => onChange({ ...form, city: e.target.value })}
          />
        </div>

        <div className="field">
          <label className="fieldLabel">Country</label>
          <input
            className="input"
            value={form.country ?? ""}
            onChange={(e) => onChange({ ...form, country: e.target.value })}
          />
        </div>
      </div>

      <div className="stepperActions">
        <button className="btn btnGhost" type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button
          className="btn btnGhost btnSm stepperSaveBtn"
          type="button"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function resolveCompanyLogoUrl(company: Company): string {
  const id = String((company as any)?.id ?? "").trim();
  const hasLogo = Boolean((company as any)?.has_logo ?? (company as any)?.hasLogo);
  const legacy = String((company as any)?.logo_url ?? "").trim();

  if (id && hasLogo) {
    const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
    const apiBase = `${String(apiUrl).replace(/\/$/, "")}/api/v1`;
    return `${apiBase}/public/companies/${encodeURIComponent(id)}/logo`;
  }

  return legacy;
}

function ReadField({ label, value }: { label: string; value: unknown }) {
  const display = value === null || value === undefined || String(value).trim() === "" ? "—" : String(value);
  return (
    <div className="readField">
      <span className="readLabel">{label}</span>
      <span className="readValue">{display}</span>
    </div>
  );
}

function ReadFieldFull({ label, value }: { label: string; value: unknown }) {
  const display = value === null || value === undefined || String(value).trim() === "" ? "—" : String(value);
  return (
    <div className="readFieldFull">
      <span className="readLabel">{label}</span>
      <span className="readValue">{display}</span>
    </div>
  );
}

function UsersModal({
  open,
  company,
  onClose,
}: {
  open: boolean;
  company: Company | null;
  onClose: () => void;
}) {
  if (!open || !company) return null;

  const names = getCompanyUserNames(company);

  return (
    <div className="modalOverlay" role="presentation" onMouseDown={onClose}>
      <div
        className="modalCard"
        role="dialog"
        aria-modal="true"
        aria-label="Company users"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modalTitle">Users — {company.name}</div>

        <div className="modalMessage">
          {names.length === 0 ? (
            "No users assigned."
          ) : (
            <div className="usersModalList" role="list">
              {names.map((n) => (
                <div key={n} className="usersModalItem" role="listitem">
                  {n}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modalActions">
          <button className="btn btnGhost" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="modalOverlay" role="presentation" onMouseDown={onCancel}>
      <div
        className="modalCard"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modalTitle">{title}</div>
        <div className="modalMessage">{message}</div>
        <div className="modalActions">
          <button className="btn btnGhost" type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="btn btnDanger" type="button" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
