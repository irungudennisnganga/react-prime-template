import { FormEvent, useEffect, useRef, useState } from "react";
import { Message } from "primereact/message";
import { Toast } from "primereact/toast";
import { Link, useNavigate } from "react-router-dom";

import AuthLayout from "../../components/ui/AuthLayout";
import FormInput from "../../components/ui/FormInput";
import PageLoader from "../../components/ui/PageLoader";
import { authApi } from "../../services/api";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { clearAuthMessages, signupUser } from "../../store/slices/authSlice";

export default function Signup() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);

  const { loading, error, successMessage } = useAppSelector(
    (state) => state.auth
  );

  const [form, setForm] = useState({
    email: "",
    full_name: "",
    phone_number: "",
    password: "",
    company_name: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    dispatch(clearAuthMessages());
  }, [dispatch]);

  const showToast = (
    severity: "success" | "info" | "warn" | "error",
    summary: string,
    detail: string
  ) => {
    toast.current?.show({
      severity,
      summary,
      detail,
      life: 3500,
    });
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.email.trim()) {
      nextErrors.email = "Work email is required";
    }

    if (!form.full_name.trim()) {
      nextErrors.full_name = "Full name is required";
    }

    if (!form.phone_number.trim()) {
      nextErrors.phone_number = "Phone number is required";
    }

    if (!form.password.trim()) {
      nextErrors.password = "Password is required";
    }

    if (!form.company_name.trim()) {
      nextErrors.company_name = "Company name is required";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      showToast("warn", "Missing information", "Please complete all required fields.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!validate()) return;

    const result = await dispatch(signupUser(form));

    if (signupUser.fulfilled.match(result)) {
      showToast(
        "success",
        "Account created",
        "Your account has been created successfully."
      );

      setTimeout(() => {
        navigate("/login");
      }, 1000);

      return;
    }

    showToast(
      "error",
      "Signup failed",
      String(result.payload || "Could not create account.")
    );
  };

  return (
    <AuthLayout>
      <Toast ref={toast} position="top-right" />

      <div className="auth-card signup-auth-card">
        <div className="auth-card-header">
          <h1>Create account</h1>
          <p>Sign up to get started with OpsRadar.</p>
        </div>

        {error && (
          <div className="auth-message">
            <Message severity="error" text={error} />
          </div>
        )}

        {successMessage && (
          <div className="auth-message">
            <Message severity="success" text={successMessage} />
          </div>
        )}

        {loading && <PageLoader message="Creating your account..." />}

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

          <FormInput
            label="Full Name"
            name="full_name"
            type="text"
            icon="pi pi-user"
            value={form.full_name}
            placeholder="Dennis Codes"
            error={errors.full_name}
            onChange={(value) =>
              setForm((prev) => ({
                ...prev,
                full_name: value,
              }))
            }
          />

          <FormInput
            label="Phone Number"
            name="phone_number"
            type="tel"
            icon="pi pi-phone"
            value={form.phone_number}
            placeholder="0767908789"
            error={errors.phone_number}
            onChange={(value) =>
              setForm((prev) => ({
                ...prev,
                phone_number: value,
              }))
            }
          />

          <FormInput
            label="Password"
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

          <FormInput
            label="Company Name"
            name="company_name"
            type="text"
            icon="pi pi-building"
            value={form.company_name}
            placeholder="Company name"
            error={errors.company_name}
            onChange={(value) =>
              setForm((prev) => ({
                ...prev,
                company_name: value,
              }))
            }
          />

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR SIGN UP WITH</span>
        </div>

        <button
          type="button"
          className="google-auth-btn"
          onClick={() => authApi.googleAuth()}
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
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </AuthLayout>
  );
}