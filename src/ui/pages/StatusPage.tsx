const STATUSES = [
  { code: "APPLIED", label: "Applied" },
  { code: "SCREENING", label: "Screening" },
  { code: "LONG_LISTED", label: "Long Listed" },
  { code: "SHORTLISTED", label: "Shortlisted" },
  { code: "ORAL_INTERVIEW", label: "Oral Interview" },
  { code: "PRACTICAL_INTERVIEW", label: "Practical Interview" },
  { code: "FINAL_INTERVIEW", label: "Final Interview" },
  { code: "OFFER_MADE", label: "Offer Made" },
  { code: "HIRED", label: "Hired" },
  { code: "REJECTED", label: "Rejected" },
  { code: "WITHDRAWN", label: "Withdrawn" },
] as const;

function getToneStyle(code: string) {
  if (code === "HIRED") {
    return {
      background: "color-mix(in srgb, var(--card2) 88%, #22c55e 12%)",
      borderColor: "color-mix(in srgb, var(--stroke) 50%, #22c55e 50%)",
    };
  }
  if (code === "REJECTED" || code === "WITHDRAWN") {
    return {
      background: "color-mix(in srgb, var(--card2) 88%, var(--danger) 12%)",
      borderColor: "color-mix(in srgb, var(--stroke) 45%, var(--danger) 55%)",
    };
  }
  return {
    background: "var(--card2)",
    borderColor: "var(--stroke)",
  };
}

export function StatusPage() {
  return (
    <div className="page">
      <div className="companiesHeader">
        <h1 className="pageTitle">Application Statuses</h1>
      </div>

      <div className="dropPanel" style={{ padding: "16px 20px" }}>
        <p className="pageText" style={{ marginBottom: 14 }}>
          Application statuses are system-defined.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 10,
          }}
        >
          {STATUSES.map((status, index) => (
            <div
              key={status.code}
              className="dashCard"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "10px 12px",
                borderWidth: 1,
                borderStyle: "solid",
                ...getToneStyle(status.code),
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div className="readLabel">Step {index + 1}</div>
                <div className="tdStrong" style={{ marginTop: 2 }}>
                  {status.label}
                </div>
              </div>
              <span className="chipBadge" style={{ whiteSpace: "nowrap" }}>
                {status.code}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
