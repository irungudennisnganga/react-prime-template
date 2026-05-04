import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SESSION_DATA_KEY } from "../services/api";
import { useAppSelector } from "../store/hooks";
// import "./Profile.css";

type StoredTenant = {
  id?: string;
  name?: string;
  created_at?: string;
};

type StoredUser = {
  id?: string;
  email?: string;
  full_name?: string;
  phone_number?: string;
  is_verified?: boolean;
  role?: string;
  created_at?: string;
};

type StoredSession = {
  role?: string;
  tenant?: StoredTenant;
  user?: StoredUser;
};

function getStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function formatDateForInput(date?: string) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getInitials(name?: string, email?: string) {
  const source = name?.trim() || email?.trim() || "User";
  const parts = source.split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function splitName(fullName?: string) {
  if (!fullName?.trim()) {
    return {
      firstName: "—",
      lastName: "—",
    };
  }

  const parts = fullName.trim().split(" ");

  return {
    firstName: parts[0] || "—",
    lastName: parts.slice(1).join(" ") || "—",
  };
}

export default function Profile() {
  const navigate = useNavigate();
  const auth = useAppSelector((state) => state.auth);

  const storedSession = useMemo(() => getStoredSession(), []);

  const user = auth.user || storedSession?.user || null;
  const tenant = auth.tenant || storedSession?.tenant || null;
  const role = auth.role || storedSession?.role || user?.role || "—";

  const displayName = user?.full_name?.trim() || "OpsRadar User";
  const initials = getInitials(user?.full_name, user?.email);
  const { firstName, lastName } = splitName(user?.full_name);

  if (!user) {
    return (
      <div className="profile-shell">
        <div className="profile-empty-card">
          <div className="profile-empty-icon">
            <i className="pi pi-user" />
          </div>

          <h3>No profile data found</h3>
          <p>Please log in again to refresh your session.</p>

          <button
            type="button"
            className="profile-primary-btn"
            onClick={() => navigate("/login")}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-shell">
      <div className="profile-layout-card">
        <aside className="profile-side-card">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">{initials}</div>

            <button type="button" className="profile-avatar-edit">
              <i className="pi pi-pencil" />
            </button>
          </div>

          <h2>{displayName}</h2>
          <p>{role}</p>

          <div className="profile-side-menu">
            <button type="button" className="profile-side-menu-item active">
              <i className="pi pi-user" />
              Personal Information
            </button>

            <button type="button" className="profile-side-menu-item">
              <i className="pi pi-lock" />
              Login & Password
            </button>

            <button
              type="button"
              className="profile-side-menu-item"
              onClick={() => navigate("/dashboard")}
            >
              <i className="pi pi-arrow-left" />
              Back to Dashboard
            </button>
          </div>
        </aside>

        <main className="profile-main-card">
          <div className="profile-main-header">
            <div>
              <span className="profile-section-pill">
                <i className="pi pi-id-card" />
                Account Profile
              </span>

              <h1>Personal Information</h1>
              <p>View your logged-in account and tenant details.</p>
            </div>

            <span
              className={
                user.is_verified
                  ? "profile-verified-badge verified"
                  : "profile-verified-badge unverified"
              }
            >
              <i
                className={
                  user.is_verified
                    ? "pi pi-check-circle"
                    : "pi pi-exclamation-triangle"
                }
              />
              {user.is_verified ? "Verified" : "Not Verified"}
            </span>
          </div>

          <div className="profile-form">
            <div className="profile-radio-row">
              <span className="profile-form-label">Account Type</span>

              <label>
                <input type="radio" checked readOnly />
                <span>{role}</span>
              </label>
            </div>

            <div className="profile-form-grid">
              <div className="profile-field">
                <label>First Name</label>
                <input value={firstName} readOnly />
              </div>

              <div className="profile-field">
                <label>Last Name</label>
                <input value={lastName} readOnly />
              </div>
            </div>

            <div className="profile-field">
              <label>Email</label>

              <div className="profile-input-with-badge">
                <input value={user.email || "—"} readOnly />

                <span
                  className={
                    user.is_verified
                      ? "profile-inline-status verified"
                      : "profile-inline-status unverified"
                  }
                >
                  <i
                    className={
                      user.is_verified
                        ? "pi pi-check-circle"
                        : "pi pi-exclamation-triangle"
                    }
                  />
                  {user.is_verified ? "Verified" : "Unverified"}
                </span>
              </div>
            </div>

            <div className="profile-field">
              <label>Tenant / Organization</label>
              <input value={tenant?.name || "—"} readOnly />
            </div>

            <div className="profile-form-grid">
              <div className="profile-field">
                <label>Phone Number</label>
                <input value={user.phone_number || "—"} readOnly />
              </div>

              <div className="profile-field">
                <label>User Created At</label>

                <div className="profile-input-icon">
                  <input value={formatDateForInput(user.created_at)} readOnly />
                  <i className="pi pi-calendar" />
                </div>
              </div>
            </div>

            <div className="profile-form-grid">
              <div className="profile-field">
                <label>Tenant ID</label>
                <input value={tenant?.id || "—"} readOnly />
              </div>

              <div className="profile-field">
                <label>User ID</label>
                <input value={user.id || "—"} readOnly />
              </div>
            </div>

            <div className="profile-action-row">
              <button
                type="button"
                className="profile-outline-btn"
                onClick={() => navigate("/dashboard")}
              >
                Discard Changes
              </button>

              <button type="button" className="profile-primary-btn">
                Save Changes
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}