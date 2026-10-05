import { type ReactNode, useState } from "react";

// One education / experience / reference entry in a job seeker profile view.
// Entries alternate between two background tones so neighbours are easy to
// tell apart; extra details stay hidden behind "View more".
export function ProfileRecord({
  title,
  index,
  summary,
  details,
}: {
  title: string;
  index: number;
  summary: ReactNode;
  details?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const toneClass = index % 2 === 0 ? "profileRecordToneA" : "profileRecordToneB";

  return (
    <div className={`profileRecord ${toneClass}`}>
      <div className="profileRecordHeader">
        <div className="profileRecordHeading">{title}</div>
        {details ? (
          <button
            type="button"
            className="btn btnGhost btnSm"
            aria-expanded={expanded}
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? "View less" : "View more"}
          </button>
        ) : null}
      </div>
      <div className="profileReadGrid" style={{ marginTop: 0 }}>
        {summary}
        {expanded ? details : null}
      </div>
    </div>
  );
}
