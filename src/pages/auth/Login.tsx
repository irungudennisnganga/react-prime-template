import { FormEvent, useEffect, useState } from "react";
import { Message } from "primereact/message";
import { Checkbox } from "primereact/checkbox";
import { Link, useNavigate } from "react-router-dom";

import AuthLayout from "../../components/ui/AuthLayout";
import FormInput from "../../components/ui/FormInput";
import PageLoader from "../../components/ui/PageLoader";
import { useAppToast } from "../../components/ui/AppToast";
import { authApi } from "../../services/api";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { clearAuthMessages, loginUser } from "../../store/slices/authSlice";

export default function Login() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { showToast } = useAppToast();

  const { loading, error, isAuthenticated } = useAppSelector(
    (state) => state.auth
  );

  const [rememberMe, setRememberMe] = useState(true);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    dispatch(clearAuthMessages());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.email.trim()) {
      nextErrors.email = "Email is required";
    }

    if (!form.password.trim()) {
      nextErrors.password = "Password is required";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      showToast(
        "warn",
        "Missing information",
        "Please fill in all required fields."
      );

      return false;
    }

    return true;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!validate()) return;

    const result = await dispatch(loginUser(form));

    if (loginUser.fulfilled.match(result)) {
      showToast("success", "Login successful", "Redirecting to dashboard...");

      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 900);

      return;
    }

    showToast(
      "error",
      "Login failed",
      String(result.payload || "Invalid email or password.")
    );
  };

  const handleGoogleAuth = () => {
    showToast("info", "Google sign in", "Redirecting to Google...");

    setTimeout(() => {
      authApi.googleAuth();
    }, 500);
  };

  return (
    <AuthLayout>
      <div className="auth-card login-auth-card">
        <div className="auth-card-header">
          <h1>Welcome back</h1>
          <p>Log in to your dashboard to view system status.</p>
        </div>

        {error && (
          <div className="auth-message">
            <Message severity="error" text={error} />
          </div>
        )}

        {loading && <PageLoader message="Signing you in..." />}

        <form onSubmit={handleSubmit} className="auth-form">
          <FormInput
            label="Work Email"
            name="email"
            type="email"
            icon="pi pi-envelope"
            value={form.email}
            placeholder="dev@company.com"
            error={errors.email}
            onChange={(value) =>
              setForm((prev) => ({
                ...prev,
                email: value,
              }))
            }
          />

          <div>
            <div className="auth-label-row">
              <label>Password</label>
              <Link to="/forgot-password">Forgot password?</Link>
            </div>

            <FormInput
              label=""
              name="password"
              type="password"
              icon="pi pi-lock"
              value={form.password}
              placeholder="••••••••"
              error={errors.password}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  password: value,
                }))
              }
            />
          </div>

          <div className="auth-options-row">
            <div className="remember-row">
              <Checkbox
                inputId="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(Boolean(e.checked))}
              />

              <label htmlFor="rememberMe">Remember me for 30 days</label>
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <i className="pi pi-spin pi-spinner" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR CONTINUE WITH</span>
        </div>

        <button
          type="button"
          className="google-auth-btn"
          onClick={handleGoogleAuth}
          disabled={loading}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M21.35 11.1H12v2.9h5.35c-.25 1.48-1.62 4.35-5.35 4.35A6.34 6.34 0 0 1 5.65 12 6.34 6.34 0 0 1 12 5.65c1.85 0 3.1.8 3.8 1.48l2.6-2.5C16.75 3.1 14.6 2.2 12 2.2A9.8 9.8 0 1 0 12 21.8c5.65 0 9.4-3.98 9.4-9.58 0-.65-.05-.95-.05-1.12Z"
            />
            <path
              fill="#34A853"
              d="M3.55 7.8 6.2 9.75A6.34 6.34 0 0 1 12 5.65c1.85 0 3.1.8 3.8 1.48l2.6-2.5C16.75 3.1 14.6 2.2 12 2.2A9.77 9.77 0 0 0 3.55 7.8Z"
            />
            <path
              fill="#FBBC05"
              d="M12 21.8c2.6 0 4.78-.85 6.38-2.3l-3.05-2.35c-.82.55-1.9.95-3.33.95A6.3 6.3 0 0 1 6.05 13.8l-2.6 2A9.78 9.78 0 0 0 12 21.8Z"
            />
            <path
              fill="#EA4335"
              d="M6.05 13.8A5.83 5.83 0 0 1 5.65 12c0-.62.1-1.22.35-1.8L3.35 8.15A9.76 9.76 0 0 0 2.2 12c0 1.38.33 2.68.9 3.8l2.95-2Z"
            />
          </svg>
          Google
        </button>

        <p className="auth-switch-text">
          Don&apos;t have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </div>

      <div className="auth-footer">
        <div>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
        </div>

        <span>
          <i className="pi pi-check-circle" />
          All systems operational
        </span>
      </div>
    </AuthLayout>
  );
}