import { useEffect, useState } from "react";
import { Dialog } from "primereact/dialog";
import { TeamMemberPayload } from "../../services/api";

type Props = {
  visible: boolean;
  loading: boolean;
  onHide: () => void;
  onSubmit: (payload: TeamMemberPayload) => void;
};

const initialForm: TeamMemberPayload = {
  email: "",
  full_name: "",
  role: "member",
  can_manage_monitors: false,
  can_manage_ssl: false,
  can_manage_team: false,
  can_view_billing: false,
};

export default function AddTeamMemberModal({
  visible,
  loading,
  onHide,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<TeamMemberPayload>(initialForm);

  useEffect(() => {
    if (!visible) {
      setForm(initialForm);
    }
  }, [visible]);

  const updateField = <K extends keyof TeamMemberPayload>(
    key: K,
    value: TeamMemberPayload[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.email.trim() || !form.full_name.trim()) {
      return;
    }

    onSubmit({
      ...form,
      email: form.email.trim(),
      full_name: form.full_name.trim(),
    });
  };

  return (
    <Dialog
      header="Add Team Member"
      visible={visible}
      onHide={onHide}
      modal
      draggable={false}
      style={{ width: "min(720px, 96vw)" }}
      className="team-member-dialog"
    >
      <form className="team-member-form" onSubmit={handleSubmit}>
        <div className="team-form-grid">
          <label className="team-form-field">
            <span>Full Name</span>
            <input
              value={form.full_name}
              placeholder="e.g. Stanley Muiruri"
              onChange={(event) => updateField("full_name", event.target.value)}
            />
          </label>

          <label className="team-form-field">
            <span>Email Address</span>
            <input
              type="email"
              value={form.email}
              placeholder="e.g. user@company.com"
              onChange={(event) => updateField("email", event.target.value)}
            />
          </label>
        </div>

        <label className="team-form-field">
          <span>Role</span>
          <select
            value={form.role}
            onChange={(event) => updateField("role", event.target.value)}
          >
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </select>
        </label>

        <div className="team-permission-card">
          <div>
            <h3>Permissions</h3>
            <p>Select what this member can manage inside OpsRadar.</p>
          </div>

          <div className="team-permission-grid">
            <label>
              <input
                type="checkbox"
                checked={form.can_manage_monitors}
                onChange={(event) =>
                  updateField("can_manage_monitors", event.target.checked)
                }
              />
              <span>Manage Monitors</span>
            </label>

            <label>
              <input
                type="checkbox"
                checked={form.can_manage_ssl}
                onChange={(event) =>
                  updateField("can_manage_ssl", event.target.checked)
                }
              />
              <span>Manage SSL</span>
            </label>

            <label>
              <input
                type="checkbox"
                checked={form.can_manage_team}
                onChange={(event) =>
                  updateField("can_manage_team", event.target.checked)
                }
              />
              <span>Manage Team</span>
            </label>

            <label>
              <input
                type="checkbox"
                checked={form.can_view_billing}
                onChange={(event) =>
                  updateField("can_view_billing", event.target.checked)
                }
              />
              <span>View Billing</span>
            </label>
          </div>
        </div>

        <div className="team-modal-actions">
          <button type="button" className="secondary-btn" onClick={onHide}>
            Cancel
          </button>

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? (
              <>
                <i className="pi pi-spin pi-spinner" />
                Saving...
              </>
            ) : (
              <>
                <i className="pi pi-plus" />
                Add Member
              </>
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}