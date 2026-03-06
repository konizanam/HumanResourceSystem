export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="page">
      <h1 className="pageTitle">{title}</h1>
      <p className="pageText">This section is under construction.</p>
    </div>
  );
}
