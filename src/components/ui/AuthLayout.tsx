import { ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="auth-page">
      <section className="auth-left-panel">
        <div className="auth-brand-block">
          <div className="auth-logo-row">
            <div className="auth-logo-mark">
              <span />
            </div>

            <h2>OpsRadar</h2>
          </div>

          <p className="auth-quote">
            "Reliability is not an option, it's the foundation. Monitor your
            infrastructure with precision."
          </p>

          <div className="auth-slides">
            <span className="active" />
            <span />
            <span />
          </div>
        </div>
      </section>

      <section className="auth-right-panel">{children}</section>
    </div>
  );
}