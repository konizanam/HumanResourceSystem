// Suggestion lists shared by sign-up and My Profile, plus the check that keeps
// typed values to what the list offers.

export const QUALIFICATION_LEVELS = [
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

export const FIELD_OF_STUDY_OPTIONS = [
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

/** Returns the listed spelling for an exact (case-insensitive) match, else null. */
export function matchOption(value: string | null | undefined, options: readonly string[]): string | null {
  const key = String(value ?? "").trim().toLowerCase();
  if (!key) return null;
  return options.find((option) => option.toLowerCase() === key) ?? null;
}

/** Validation message for a typed value that is not one of the suggestions. */
export function selectFromListMessage(label: string): string {
  return `Select a ${label} from the list`;
}
