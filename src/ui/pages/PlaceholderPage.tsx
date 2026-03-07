export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="page" aria-busy="true" aria-live="polite" role="status">
      <div className="placeholderSpinnerWrap" aria-hidden="true">
        <span className="placeholderSpinner" />
      </div>
      <span className="srOnly">{title}</span>
    </div>
  );
}
