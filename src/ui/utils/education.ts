// Display helpers for education entries: the free-text qualification name
// (e.g. "Bachelor of Information Technology") with the listed qualification
// type (e.g. "Bachelor's") as fallback for entries saved before names existed.

type EducationLike = Record<string, unknown> | null | undefined;

function text(source: EducationLike, ...keys: string[]): string {
  if (!source) return "";
  for (const key of keys) {
    const value = String(source[key] ?? "").trim();
    if (value) return value;
  }
  return "";
}

export function qualificationName(edu: EducationLike): string {
  return text(edu, "qualification_name", "qualificationName");
}

export function qualificationType(edu: EducationLike): string {
  return text(edu, "qualification", "qualification_type", "qualificationType");
}

/** Heading for an entry: the qualification name, else its type. */
export function educationTitle(edu: EducationLike): string {
  return qualificationName(edu) || qualificationType(edu);
}

/** Name and type together, e.g. "Bachelor of Information Technology (Bachelor's)". */
export function educationLabel(edu: EducationLike): string {
  const name = qualificationName(edu);
  const type = qualificationType(edu);
  if (name && type && name.toLowerCase() !== type.toLowerCase()) return `${name} (${type})`;
  return name || type;
}
