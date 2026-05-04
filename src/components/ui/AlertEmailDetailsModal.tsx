import { Dialog } from "primereact/dialog";
import { AlertEmail } from "../../services/api";
import PageLoader from "./PageLoader";

type Props = {
  visible: boolean;
  email: AlertEmail | null;
  loading: boolean;
  onHide: () => void;
};

function formatDate(date?: string | null) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleString();
}

function renderEmailBody(body?: string) {
  if (!body) return "No email body available.";

  return body;
}

export default function AlertEmailDetailsModal({
  visible,
  email,
  loading,
  onHide,
}: Props) {
  return (
    <Dialog
      header="Alert Email Details"
      visible={visible}
      onHide={onHide}
      modal
      draggable={false}
      style={{ width: "min(980px, 96vw)" }}
      className="alert-email-dialog"
    >
      {loading ? (
        <PageLoader message="Loading email details..." />
      ) : !email ? (
        <div className="empty-state">
          <i className="pi pi-envelope" />
          <h3>No email selected</h3>
          <p>Select an email to view its content.</p>
        </div>
      ) : (
        <div className="alert-email-modal-body">
          <div className="alert-email-modal-header">
            <div>
              <span className="email-modal-pill">
                <i className="pi pi-envelope" />
                {email.event_type || "Alert Email"}
              </span>

              <h2>{email.subject || "No subject"}</h2>
              <p>
                Sent to <strong>{email.to_email || "—"}</strong>
              </p>
            </div>

            <span
              className={
                email.status === "sent"
                  ? "status-badge online"
                  : email.status === "failed"
                    ? "status-badge offline"
                    : "status-badge pending"
              }
            >
              {email.status || "unknown"}
            </span>
          </div>

          <div className="alert-email-meta-grid">
            <div>
              <span>Monitor</span>
              <strong>{email.monitor_name || "—"}</strong>
            </div>

            <div>
              <span>Target</span>
              <strong>{email.target || "—"}</strong>
            </div>

            <div>
              <span>Monitor Type</span>
              <strong>{email.monitor_type || "—"}</strong>
            </div>

            <div>
              <span>Sent At</span>
              <strong>{formatDate(email.sent_at)}</strong>
            </div>

            <div>
              <span>Opened</span>
              <strong>{email.opened ? "Yes" : "No"}</strong>
            </div>

            <div>
              <span>Open Count</span>
              <strong>{email.open_count || 0}</strong>
            </div>

            <div>
              <span>Clicked Count</span>
              <strong>{email.click_count || 0}</strong>
            </div>

            <div>
              <span>Clicked At</span>
              <strong>{formatDate(email.clicked_at)}</strong>
            </div>

            <div>
              <span>Opened At</span>
              <strong>{formatDate(email.opened_at)}</strong>
            </div>

            <div>
              <span>Last Open IP</span>
              <strong>{email.last_open_ip || "—"}</strong>
            </div>
          </div>

          {email.error_message ? (
            <div className="alert-email-error-box">
              <i className="pi pi-exclamation-triangle" />
              <div>
                <strong>Email Error</strong>
                <p>{email.error_message}</p>
              </div>
            </div>
          ) : null}

          <div className="alert-email-preview-card">
            <div className="alert-email-preview-top">
              <div>
                <span>From</span>
                <strong>OpsRadar Alerts</strong>
              </div>

              <div>
                <span>To</span>
                <strong>{email.to_email || "—"}</strong>
              </div>
            </div>

            <div className="alert-email-subject-line">
              <span>Subject:</span>
              <strong>{email.subject || "No subject"}</strong>
            </div>

            <div className="alert-email-body-preview">
              {email.body?.trim().startsWith("<") ? (
                <iframe
                  title="Email Preview"
                  srcDoc={email.body}
                  sandbox=""
                  className="alert-email-iframe"
                />
              ) : (
                <pre>{renderEmailBody(email.body)}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}