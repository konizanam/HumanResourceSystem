const STATUSES = [
  "APPLIED",
  "SCREENING",
  "LONG_LISTED",
  "SHORTLISTED",
  "ORAL_INTERVIEW",
  "PRACTICAL_INTERVIEW",
  "FINAL_INTERVIEW",
  "OFFER_MADE",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
] as const;

export function StatusPage() {
  return (
    <div className="page">
      <div className="companiesHeader">
        <h1 className="pageTitle">Application Statuses</h1>
      </div>

      <div className="dropPanel" style={{ padding: "16px 20px" }}>
        <p className="pageText" style={{ marginBottom: 12 }}>
          Application statuses are system-defined.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {STATUSES.map((status) => (
            <span key={status} className="chipBadge">
              {status}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
