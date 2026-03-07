export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="page" aria-busy="true" aria-live="polite" role="status">
      <span className="srOnly">{title}</span>
    </div>
  );
}
