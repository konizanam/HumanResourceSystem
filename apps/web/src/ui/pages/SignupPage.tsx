import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getIpLocation, register, saveAddress, updatePersonalDetails, updateProfile } from "../api/client";
import { COUNTRY_NAMES } from "../utils/countries";
import { NAMIBIA_REGIONS, NAMIBIA_TOWNS_CITIES } from "../utils/namibia";

const QUALIFICATION_LEVELS = [
  "Primary School",
  "Secondary School",
  "High School",
  "Certificate",
  "Diploma",
  "Advanced Diploma",
  "Bachelor's",
  "Honours",
  "Postgraduate Diploma",
  "Master's",
  "Doctorate (PhD)",
] as const;

const FIELD_OF_EXPERTISE_OPTIONS = [
  "Accounting",
  "Administration",
  "Agriculture",
  "Architecture",
  "Auditing",
  "Banking",
  "Business Analysis",
  "Business Development",
  "Civil Engineering",
  "Customer Service",
  "Data Science",
  "Education",
  "Electrical Engineering",
  "Finance",
  "Healthcare",
  "Human Resources",
  "Information Technology",
  "Law",
  "Logistics",
  "Marketing",
  "Mechanical Engineering",
  "Procurement",
  "Project Management",
  "Public Administration",
  "Sales",
  "Software Development",
] as const;

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden>
      {open ? (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <path d="M4 4 20 20" />
        </>
      )}
    </svg>
  );
}

const STEPS = [
  { label: "Personal", icon: "1" },
  { label: "Address", icon: "2" },
  { label: "Summary", icon: "3" },
  { label: "Confirm", icon: "4" },
] as const;

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;

  middleName: string;
  gender: "" | "Male" | "Female" | "Other" | "Prefer not to say";
  dateOfBirth: string;
  nationality: string;
  maritalStatus: string;
  disabilityStatus: boolean;

  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;

  professionalSummary: string;
  fieldOfExpertise: string;
  qualificationLevel: string;
  yearsExperience: string;
};

const INITIAL: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",

  middleName: "",
  gender: "",
  dateOfBirth: "",
  nationality: "",
  maritalStatus: "",
  disabilityStatus: false,

  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",

  professionalSummary: "",
  fieldOfExpertise: "",
  qualificationLevel: "",
  yearsExperience: "",
};

const DEV_PREFILL: Partial<FormData> = {
  firstName: "Micheal",
  lastName: "Shilunga",
  email: "michealshilunga@gmail.com",
  password: "K0ndj@B0y",
  confirmPassword: "K0ndj@B0y",

  gender: "Male",
  dateOfBirth: "1990-01-01",
  nationality: "Namibia",
  maritalStatus: "Single",
  disabilityStatus: false,

  addressLine1: "123 Main Street",
  city: "Windhoek",
  country: "Namibia",

  professionalSummary: "Motivated job seeker looking for opportunities.",
  fieldOfExpertise: "Information Technology",
  qualificationLevel: "Bachelor's",
  yearsExperience: "2",
};

export function SignupPage() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(() =>
    import.meta.env.DEV ? { ...INITIAL, ...DEV_PREFILL } : INITIAL
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [nationalityOpen, setNationalityOpen] = useState(false);
  const [fieldOpen, setFieldOpen] = useState(false);
  const [qualificationOpen, setQualificationOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [ipCountryCode, setIpCountryCode] = useState<string | null>(null);

  const isNamibia = ipCountryCode === "NA";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loc = await getIpLocation();
        if (cancelled) return;
        setIpCountryCode(loc.countryCode);

        if (loc.countryCode === "NA") {
          setForm((prev) => {
            if (prev.country.trim()) return prev;
            return { ...prev, country: "Namibia" };
          });
        }
      } catch {
        // Best-effort only: if geo fails, don't block signup.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  const nationalitySuggestions = useMemo(() => {
    const q = form.nationality.trim().toLowerCase();
    if (!q) return [];
    const matches = COUNTRY_NAMES.filter((c) =>
      c.toLowerCase().startsWith(q)
    );
    return matches.slice(0, 8);
  }, [form.nationality]);

  const passwordChecks = useMemo(() => {
    const password = form.password;
    return {
      minLength: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&#]/.test(password),
    };
  }, [form.password]);

  const fieldSuggestions = useMemo(() => {
    const q = form.fieldOfExpertise.trim().toLowerCase();
    const options = FIELD_OF_EXPERTISE_OPTIONS as readonly string[];
    if (!q) return options.slice(0, 10);
    return options
      .filter((o) => o.toLowerCase().includes(q))
      .slice(0, 10);
  }, [form.fieldOfExpertise]);

  const qualificationSuggestions = useMemo(() => {
    const q = form.qualificationLevel.trim().toLowerCase();
    const options = QUALIFICATION_LEVELS as readonly string[];
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [form.qualificationLevel]);

  const namibiaCitySuggestions = useMemo(() => {
    if (!isNamibia) return [];
    const q = form.city.trim().toLowerCase();
    const options = NAMIBIA_TOWNS_CITIES as readonly string[];
    if (!q) return options.slice(0, 10);
    return options.filter((o) => o.toLowerCase().startsWith(q)).slice(0, 10);
  }, [form.city, isNamibia]);

  const namibiaRegionSuggestions = useMemo(() => {
    if (!isNamibia) return [];
    const q = form.state.trim().toLowerCase();
    const options = NAMIBIA_REGIONS as readonly string[];
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().startsWith(q));
  }, [form.state, isNamibia]);

  /* ── Per-step validation ──────────────────────────── */

  function validateStep(): boolean {
    const errs: Record<string, string> = {};

    if (step === 0) {
      if (!form.firstName.trim()) errs.firstName = "First name is required";
      if (!form.lastName.trim()) errs.lastName = "Last name is required";

      if (!form.email.trim()) errs.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        errs.email = "Invalid email format";

      if (form.password.length < 8)
        errs.password = "At least 8 characters";
      else if (
        !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/.test(
          form.password
        )
      )
        errs.password =
          "Must include upper, lower, number & special character";

      if (form.confirmPassword !== form.password)
        errs.confirmPassword = "Passwords do not match";

      if (!form.gender) errs.gender = "Gender is required";
      if (!form.dateOfBirth) errs.dateOfBirth = "Date of birth is required";
      if (!form.nationality.trim()) errs.nationality = "Nationality is required";
    }

    if (step === 1) {
      if (!form.addressLine1.trim()) errs.addressLine1 = "Address line 1 is required";
      if (!form.city.trim()) errs.city = "City is required";
      if (!form.country.trim()) errs.country = "Country is required";
    }

    if (step === 2) {
      if (!form.fieldOfExpertise.trim()) errs.fieldOfExpertise = "Field of expertise is required";
      if (!form.qualificationLevel.trim()) errs.qualificationLevel = "Qualification level is required";
      if (!form.yearsExperience.trim()) errs.yearsExperience = "Years of experience is required";
      else if (!/^\d+$/.test(form.yearsExperience.trim())) errs.yearsExperience = "Must be a number";
      if (!form.professionalSummary.trim()) errs.professionalSummary = "Professional summary is required";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function onNext() {
    setError(null);
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function onBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // on last step, submit
    if (step < STEPS.length - 1) {
      onNext();
      return;
    }

    setBusy(true);
    try {
      let token = createdToken;
      const userEmail = form.email.trim();

      if (!token) {
        const result = await register({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: userEmail,
          password: form.password,
          confirmPassword: form.confirmPassword,
        });
        token = result.accessToken;
        setCreatedToken(token);
      }

      await updatePersonalDetails(token, {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        middle_name: form.middleName.trim() || undefined,
        gender: form.gender,
        date_of_birth: form.dateOfBirth,
        nationality: form.nationality.trim(),
        marital_status: form.maritalStatus.trim() || undefined,
        disability_status: form.disabilityStatus,
      });

      await saveAddress(token, {
        address_line1: form.addressLine1.trim(),
        address_line2: form.addressLine2.trim() || undefined,
        city: form.city.trim(),
        state: form.state.trim() || undefined,
        country: form.country.trim(),
        postal_code: form.postalCode.trim() || undefined,
        is_primary: true,
      });

      await updateProfile(token, {
        professional_summary: form.professionalSummary.trim(),
        field_of_expertise: form.fieldOfExpertise.trim(),
        qualification_level: form.qualificationLevel.trim(),
        years_experience: Number(form.yearsExperience.trim()),
      });

      setSession(token, userEmail);
      navigate("/app/job-seekers", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  /* ── Step renderers ───────────────────────────────── */

  function renderStepContent() {
    switch (step) {
      case 0:
        return (
          <>
            <label className="field">
              <span className="fieldLabel">First Name</span>
              <input
                className="input"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                placeholder="Enter your first name"
                autoFocus
                required
              />
              {fieldErrors.firstName && (
                <span className="fieldError">{fieldErrors.firstName}</span>
              )}
            </label>

            <label className="field">
              <span className="fieldLabel">Last Name</span>
              <input
                className="input"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                placeholder="Enter your last name"
                required
              />
              {fieldErrors.lastName && (
                <span className="fieldError">{fieldErrors.lastName}</span>
              )}
            </label>

            <label className="field">
              <span className="fieldLabel">Email Address</span>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
              {fieldErrors.email && (
                <span className="fieldError">{fieldErrors.email}</span>
              )}
            </label>

            <label className="field">
              <span className="fieldLabel">Password</span>
              <div className="inputWithIcon">
                <input
                  className="input"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="Min 8 chars, upper, lower, number, special"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="inputIconBtn"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {form.password.length > 0 && (
                <ul className="passwordRules" aria-label="Password requirements">
                  <li
                    className={
                      passwordChecks.minLength
                        ? "passwordRule passwordRuleMet"
                        : "passwordRule passwordRuleUnmet"
                    }
                  >
                    <span className="passwordRuleIcon" aria-hidden>
                      {passwordChecks.minLength ? "✓" : "✕"}
                    </span>
                    At least 8 characters
                  </li>
                  <li
                    className={
                      passwordChecks.upper
                        ? "passwordRule passwordRuleMet"
                        : "passwordRule passwordRuleUnmet"
                    }
                  >
                    <span className="passwordRuleIcon" aria-hidden>
                      {passwordChecks.upper ? "✓" : "✕"}
                    </span>
                    Contains an uppercase letter
                  </li>
                  <li
                    className={
                      passwordChecks.lower
                        ? "passwordRule passwordRuleMet"
                        : "passwordRule passwordRuleUnmet"
                    }
                  >
                    <span className="passwordRuleIcon" aria-hidden>
                      {passwordChecks.lower ? "✓" : "✕"}
                    </span>
                    Contains a lowercase letter
                  </li>
                  <li
                    className={
                      passwordChecks.number
                        ? "passwordRule passwordRuleMet"
                        : "passwordRule passwordRuleUnmet"
                    }
                  >
                    <span className="passwordRuleIcon" aria-hidden>
                      {passwordChecks.number ? "✓" : "✕"}
                    </span>
                    Contains a number
                  </li>
                  <li
                    className={
                      passwordChecks.special
                        ? "passwordRule passwordRuleMet"
                        : "passwordRule passwordRuleUnmet"
                    }
                  >
                    <span className="passwordRuleIcon" aria-hidden>
                      {passwordChecks.special ? "✓" : "✕"}
                    </span>
                    Contains a special character (@$!%*?&#)
                  </li>
                </ul>
              )}
              {fieldErrors.password && (
                <span className="fieldError">{fieldErrors.password}</span>
              )}
            </label>

            <label className="field">
              <span className="fieldLabel">Confirm Password</span>
              <div className="inputWithIcon">
                <input
                  className="input"
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => set("confirmPassword", e.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="inputIconBtn"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowConfirmPassword((v) => !v)}
                >
                  <EyeIcon open={showConfirmPassword} />
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <span className="fieldError">{fieldErrors.confirmPassword}</span>
              )}
            </label>

            <label className="field">
              <span className="fieldLabel">Middle Name (optional)</span>
              <input
                className="input"
                value={form.middleName}
                onChange={(e) => set("middleName", e.target.value)}
                placeholder="Enter your middle name"
              />
            </label>

            <label className="field">
              <span className="fieldLabel">Gender</span>
              <select
                className="input"
                value={form.gender}
                onChange={(e) =>
                  set("gender", e.target.value as FormData["gender"])
                }
                required
              >
                <option value="" disabled>
                  Select gender
                </option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
              {fieldErrors.gender && (
                <span className="fieldError">{fieldErrors.gender}</span>
              )}
            </label>

            <label className="field">
              <span className="fieldLabel">Date of Birth</span>
              <input
                className="input"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => set("dateOfBirth", e.target.value)}
                required
              />
              {fieldErrors.dateOfBirth && (
                <span className="fieldError">{fieldErrors.dateOfBirth}</span>
              )}
            </label>

            <label className="field">
              <span className="fieldLabel">Nationality</span>
              <input
                className="input"
                value={form.nationality}
                onChange={(e) => {
                  set("nationality", e.target.value);
                  setNationalityOpen(true);
                }}
                onFocus={() => setNationalityOpen(true)}
                onBlur={() => setNationalityOpen(false)}
                placeholder="Start typing (e.g. Namibia)"
                required
              />
              {nationalityOpen && nationalitySuggestions.length > 0 && (
                <div
                  className="autocompleteList"
                  role="listbox"
                  aria-label="Nationality suggestions"
                >
                  {nationalitySuggestions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="autocompleteItem"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        set("nationality", c);
                        setNationalityOpen(false);
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
              {fieldErrors.nationality && (
                <span className="fieldError">{fieldErrors.nationality}</span>
              )}
            </label>

            <label className="field">
              <span className="fieldLabel">Marital Status (optional)</span>
              <select
                className="input"
                value={form.maritalStatus}
                onChange={(e) => set("maritalStatus", e.target.value)}
              >
                <option value="">Select marital status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
                <option value="Domestic partnership">Domestic partnership</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </label>

            <label className="field">
              <span className="fieldLabel">Disability Status</span>
              <div className="checkboxRow">
                <input
                  id="disabilityStatus"
                  type="checkbox"
                  checked={form.disabilityStatus}
                  onChange={(e) => set("disabilityStatus", e.target.checked)}
                />
                <label htmlFor="disabilityStatus">I have a disability</label>
              </div>
            </label>
          </>
        );

      case 1:
        return (
          <>
            <label className="field">
              <span className="fieldLabel">Address Line 1</span>
              <input
                className="input"
                value={form.addressLine1}
                onChange={(e) => set("addressLine1", e.target.value)}
                placeholder="Street address"
                autoFocus
                required
              />
              {fieldErrors.addressLine1 && (
                <span className="fieldError">{fieldErrors.addressLine1}</span>
              )}
            </label>

            <label className="field">
              <span className="fieldLabel">Address Line 2 (optional)</span>
              <input
                className="input"
                value={form.addressLine2}
                onChange={(e) => set("addressLine2", e.target.value)}
                placeholder="Apartment, suite, etc."
              />
            </label>

            <label className="field">
              <span className="fieldLabel">City</span>
              <input
                className="input"
                value={form.city}
                onChange={(e) => {
                  set("city", e.target.value);
                  if (isNamibia) setCityOpen(true);
                }}
                onFocus={() => {
                  if (isNamibia) setCityOpen(true);
                }}
                onBlur={() => setCityOpen(false)}
                placeholder="City"
                required
              />
              {isNamibia && cityOpen && namibiaCitySuggestions.length > 0 && (
                <div
                  className="autocompleteList"
                  role="listbox"
                  aria-label="Namibia city suggestions"
                >
                  {namibiaCitySuggestions.map((o) => (
                    <button
                      key={o}
                      type="button"
                      className="autocompleteItem"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        set("city", o);
                        setCityOpen(false);
                      }}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
              {fieldErrors.city && (
                <span className="fieldError">{fieldErrors.city}</span>
              )}
            </label>

            <label className="field">
              <span className="fieldLabel">State/Region (optional)</span>
              <input
                className="input"
                value={form.state}
                onChange={(e) => {
                  set("state", e.target.value);
                  if (isNamibia) setRegionOpen(true);
                }}
                onFocus={() => {
                  if (isNamibia) setRegionOpen(true);
                }}
                onBlur={() => setRegionOpen(false)}
                placeholder="State/Region"
              />
              {isNamibia && regionOpen && namibiaRegionSuggestions.length > 0 && (
                <div
                  className="autocompleteList"
                  role="listbox"
                  aria-label="Namibia region suggestions"
                >
                  {namibiaRegionSuggestions.map((o) => (
                    <button
                      key={o}
                      type="button"
                      className="autocompleteItem"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        set("state", o);
                        setRegionOpen(false);
                      }}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </label>

            <label className="field">
              <span className="fieldLabel">Country</span>
              <input
                className="input"
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                placeholder="Country"
                required
              />
              {fieldErrors.country && (
                <span className="fieldError">{fieldErrors.country}</span>
              )}
            </label>

            <label className="field">
              <span className="fieldLabel">Postal Code (optional)</span>
              <input
                className="input"
                value={form.postalCode}
                onChange={(e) => set("postalCode", e.target.value)}
                placeholder="Postal code"
              />
            </label>
          </>
        );

      case 2:
        return (
          <>
            <label className="field">
              <span className="fieldLabel">Field of Expertise</span>
              <input
                className="input"
                value={form.fieldOfExpertise}
                onChange={(e) => {
                  set("fieldOfExpertise", e.target.value);
                  setFieldOpen(true);
                }}
                onFocus={() => setFieldOpen(true)}
                onBlur={() => setFieldOpen(false)}
                placeholder="e.g. Accounting"
                autoFocus
                required
              />
              {fieldOpen && fieldSuggestions.length > 0 && (
                <div
                  className="autocompleteList"
                  role="listbox"
                  aria-label="Field of expertise suggestions"
                >
                  {fieldSuggestions.map((o) => (
                    <button
                      key={o}
                      type="button"
                      className="autocompleteItem"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        set("fieldOfExpertise", o);
                        setFieldOpen(false);
                      }}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
              {fieldErrors.fieldOfExpertise && (
                <span className="fieldError">{fieldErrors.fieldOfExpertise}</span>
              )}
            </label>

            <label className="field">
              <span className="fieldLabel">Qualification Level</span>
              <input
                className="input"
                value={form.qualificationLevel}
                onChange={(e) => {
                  set("qualificationLevel", e.target.value);
                  setQualificationOpen(true);
                }}
                onFocus={() => setQualificationOpen(true)}
                onBlur={() => setQualificationOpen(false)}
                placeholder="e.g. Bachelor's"
                required
              />
              {qualificationOpen && qualificationSuggestions.length > 0 && (
                <div
                  className="autocompleteList"
                  role="listbox"
                  aria-label="Qualification level suggestions"
                >
                  {qualificationSuggestions.map((o) => (
                    <button
                      key={o}
                      type="button"
                      className="autocompleteItem"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        set("qualificationLevel", o);
                        setQualificationOpen(false);
                      }}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
              {fieldErrors.qualificationLevel && (
                <span className="fieldError">{fieldErrors.qualificationLevel}</span>
              )}
            </label>

            <label className="field">
              <span className="fieldLabel">Years of Experience</span>
              <input
                className="input"
                inputMode="numeric"
                value={form.yearsExperience}
                onChange={(e) => set("yearsExperience", e.target.value)}
                placeholder="0"
                required
              />
              {fieldErrors.yearsExperience && (
                <span className="fieldError">{fieldErrors.yearsExperience}</span>
              )}
            </label>

            <label className="field">
              <span className="fieldLabel">Professional Summary</span>
              <textarea
                className="input"
                value={form.professionalSummary}
                onChange={(e) => set("professionalSummary", e.target.value)}
                placeholder="Write a short summary about yourself"
                rows={4}
                required
              />
              {fieldErrors.professionalSummary && (
                <span className="fieldError">{fieldErrors.professionalSummary}</span>
              )}
            </label>
          </>
        );

      case 3:
        return (
          <div className="confirmSection">
            <h3 className="confirmTitle">Review Your Information</h3>
            <div className="confirmGrid">
              <div className="confirmItem">
                <span className="confirmLabel">Name</span>
                <span className="confirmValue">
                  {form.firstName} {form.lastName}
                </span>
              </div>
              <div className="confirmItem">
                <span className="confirmLabel">Email</span>
                <span className="confirmValue">{form.email}</span>
              </div>
              <div className="confirmItem">
                <span className="confirmLabel">Gender</span>
                <span className="confirmValue">{form.gender || "—"}</span>
              </div>
              <div className="confirmItem">
                <span className="confirmLabel">Date of Birth</span>
                <span className="confirmValue">{form.dateOfBirth || "—"}</span>
              </div>
              <div className="confirmItem">
                <span className="confirmLabel">Nationality</span>
                <span className="confirmValue">{form.nationality || "—"}</span>
              </div>
              <div className="confirmItem">
                <span className="confirmLabel">Marital Status</span>
                <span className="confirmValue">{form.maritalStatus || "—"}</span>
              </div>
              <div className="confirmItem">
                <span className="confirmLabel">Address</span>
                <span className="confirmValue">
                  {form.addressLine1 && form.city && form.country
                    ? `${form.addressLine1}, ${form.city}, ${form.country}`
                    : "—"}
                </span>
              </div>
              <div className="confirmItem">
                <span className="confirmLabel">Field</span>
                <span className="confirmValue">{form.fieldOfExpertise || "—"}</span>
              </div>
              <div className="confirmItem">
                <span className="confirmLabel">Experience</span>
                <span className="confirmValue">
                  {form.yearsExperience ? `${form.yearsExperience} year(s)` : "—"}
                </span>
              </div>
              <div className="confirmItem">
                <span className="confirmLabel">Password</span>
                <span className="confirmValue">
                  {"•".repeat(form.password.length)}
                </span>
              </div>
              <div className="confirmItem">
                <span className="confirmLabel">Role</span>
                <span className="confirmValue chipBadge">Job Seeker</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="loginPage">
      <div className="loginCard signupCard">
        <div className="loginHeader">
          <div className="loginLogo">
            <img src="/hito-logo.png" alt="Hito HR Logo" className="loginLogoImg" />
          </div>
          <div className="loginTitle">Create Account</div>
          <div className="loginSubtitle">Sign up as a Job Seeker</div>
        </div>

        {/* ── Stepper ─────────────────────────────── */}
        <div className="stepper">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={
                "stepperItem" +
                (i === step ? " stepperActive" : "") +
                (i < step ? " stepperDone" : "")
              }
            >
              <div className="stepperCircle">
                {i < step ? (
                  <svg viewBox="0 0 20 20" className="stepperCheck">
                    <path d="M6 10l3 3 5-6" />
                  </svg>
                ) : (
                  s.icon
                )}
              </div>
              <span className="stepperLabel">{s.label}</span>
              {i < STEPS.length - 1 && <div className="stepperLine" />}
            </div>
          ))}
        </div>

        <form onSubmit={onSubmit} className="form">
          {renderStepContent()}

          {error && <div className="errorBox">{error}</div>}

          <div className="stepperActions">
            {step > 0 && (
              <button
                type="button"
                className="btn btnGhost"
                onClick={onBack}
                disabled={busy}
              >
                Back
              </button>
            )}
            <button
              type="submit"
              className="btn btnPrimary stepperNextBtn"
              disabled={busy}
            >
              {busy
                ? "Creating account…"
                : step === STEPS.length - 1
                  ? "Create Account"
                  : "Continue"}
            </button>
          </div>
        </form>

        <div className="loginFooter">
          Already have an account?{" "}
          <Link to="/login" className="linkBtn">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
