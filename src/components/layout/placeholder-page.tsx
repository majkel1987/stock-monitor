type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <section className="placeholder-panel" aria-labelledby="page-title">
      <p className="eyebrow">{eyebrow}</p>
      <h1 id="page-title">{title}</h1>
      <p>{description}</p>
      <dl className="foundation-status">
        <div>
          <dt>Runtime</dt>
          <dd>Next.js · Node.js</dd>
        </div>
        <div>
          <dt>Data mode</dt>
          <dd>Not connected</dd>
        </div>
        <div>
          <dt>Stage</dt>
          <dd>Project scaffold</dd>
        </div>
      </dl>
    </section>
  );
}
