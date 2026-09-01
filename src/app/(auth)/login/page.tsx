import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="login-title">
        <p className="eyebrow">Private workspace</p>
        <h1 id="login-title">Stock Monitor</h1>
        <p>
          Authentication is reserved for the database and auth implementation
          step. This route confirms the App Router boundary only.
        </p>
      </section>
    </main>
  );
}
