import { Dialog } from "primereact/dialog";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import PageLoader from "./PageLoader";
import { SSLDetails, SSLHistoryItem } from "../../services/api";

type SSLDetailsModalProps = {
  visible: boolean;
  details: SSLDetails | null;
  history: SSLHistoryItem[];
  loading: boolean;
  onHide: () => void;
};

function normalizeSSLStatus(status?: string, daysLeft?: number) {
  const value = String(status || "").toLowerCase();

  if (value === "valid") return "valid";
  if (value === "expired" || value === "invalid") return "expired";
  if (value === "warning" || (typeof daysLeft === "number" && daysLeft <= 14)) {
    return "warning";
  }

  return "unknown";
}

function statusClass(status?: string, daysLeft?: number) {
  const normalized = normalizeSSLStatus(status, daysLeft);
  return `ssl-status-badge ${normalized}`;
}

export default function SSLDetailsModal({
  visible,
  details,
  history,
  loading,
  onHide,
}: SSLDetailsModalProps) {
  const totalChecks = history.length;

  const validChecks = history.filter(
    (item) => normalizeSSLStatus(item.status, item.days_left) === "valid"
  ).length;

  const warningChecks = history.filter(
    (item) => normalizeSSLStatus(item.status, item.days_left) === "warning"
  ).length;

  const expiredChecks = history.filter(
    (item) => normalizeSSLStatus(item.status, item.days_left) === "expired"
  ).length;

  const latestDaysLeft =
    typeof details?.days_left === "number" ? details.days_left : 0;

  const statusBody = (row: SSLHistoryItem) => (
    <span className={statusClass(row.status, row.days_left)}>
      {normalizeSSLStatus(row.status, row.days_left)}
    </span>
  );

  const daysLeftBody = (row: SSLHistoryItem) => {
    const value = typeof row.days_left === "number" ? row.days_left : 0;
    return <span className="ssl-days-pill">{value} days</span>;
  };

  const expiresBody = (row: SSLHistoryItem) => {
    return row.expires_at ? new Date(row.expires_at).toLocaleString() : "—";
  };

  const checkedBody = (row: SSLHistoryItem) => {
    return row.checked_at ? new Date(row.checked_at).toLocaleString() : "—";
  };

  const errorBody = (row: SSLHistoryItem) => {
    return row.error || "No error";
  };

  return (
    <Dialog
      header={`Certificate Breakdown${details?.target ? ` - ${details.target}` : ""}`}
      visible={visible}
      style={{ width: "min(1080px, 96vw)" }}
      modal
      draggable={false}
      className="ssl-details-dialog"
      onHide={onHide}
    >
      {loading ? (
        <PageLoader message="Loading SSL certificate details..." />
      ) : !details ? (
        <div className="empty-state">
          <i className="pi pi-shield" />
          <h3>No SSL details found</h3>
          <p>This target does not have certificate details yet.</p>
        </div>
      ) : (
        <>
          <div className="ssl-breakdown-layout">
            <section className="ssl-main-cert-card">
              <div className="ssl-cert-top">
                <div>
                  <span className={statusClass(details.status, details.days_left)}>
                    {normalizeSSLStatus(details.status, details.days_left)}
                  </span>

                  <h2>{details.target}</h2>
                  <p>{details.subject || "No subject available"}</p>
                </div>

                <i className="pi pi-shield" />
              </div>

              <div className="ssl-cert-metrics">
                <div>
                  <span>Days Left</span>
                  <strong>{latestDaysLeft}</strong>
                </div>

                <div>
                  <span>Checks</span>
                  <strong>{totalChecks}</strong>
                </div>

                <div>
                  <span>Valid</span>
                  <strong>{validChecks}</strong>
                </div>

                <div>
                  <span>Warnings</span>
                  <strong>{warningChecks}</strong>
                </div>
              </div>

              <div className="ssl-validity-strip">
                <i className="pi pi-calendar" />
                <span>
                  Expires on{" "}
                  <strong>
                    {details.expires_at
                      ? new Date(details.expires_at).toLocaleString()
                      : "Not available"}
                  </strong>
                </span>
              </div>
            </section>

            <section className="ssl-side-summary-grid">
              <div className="ssl-side-card valid">
                <span>Valid Checks</span>
                <strong>{validChecks}</strong>
                <small>Healthy certificate checks</small>
              </div>

              <div className="ssl-side-card warning">
                <span>Warning Checks</span>
                <strong>{warningChecks}</strong>
                <small>Needs attention soon</small>
              </div>

              <div className="ssl-side-card expired">
                <span>Expired Checks</span>
                <strong>{expiredChecks}</strong>
                <small>Certificate failure checks</small>
              </div>
            </section>
          </div>

          <div className="ssl-info-grid">
            <div>
              <span>Issuer</span>
              <strong>{details.issuer || "—"}</strong>
            </div>

            <div>
              <span>Serial Number</span>
              <strong>{details.serial_number || "—"}</strong>
            </div>

            <div>
              <span>Target Type</span>
              <strong>{details.target_type || "—"}</strong>
            </div>

            <div>
              <span>Last Checked</span>
              <strong>
                {details.checked_at
                  ? new Date(details.checked_at).toLocaleString()
                  : "—"}
              </strong>
            </div>
          </div>

          <div className="ssl-dns-box">
            <span>SAN / DNS Names</span>

            <div>
              {details.dns_names && details.dns_names.length > 0 ? (
                details.dns_names.map((name) => (
                  <small key={name}>{name}</small>
                ))
              ) : (
                <small>No DNS names available</small>
              )}
            </div>
          </div>

          <div className="ssl-history-table-card">
            <div className="ssl-history-table-header">
              <div>
                <h3>SSL History Records</h3>
                <p>Certificate checks, expiry trend, and errors.</p>
              </div>

              <span>{history.length} records</span>
            </div>

            <DataTable
              value={history}
              paginator
              rows={8}
              rowsPerPageOptions={[5, 8, 10, 20]}
              scrollable
              scrollHeight="360px"
              stripedRows
              emptyMessage="No SSL history records found."
              className="ssl-history-datatable"
            >
              <Column header="Status" body={statusBody} sortable />
              <Column field="target" header="Target" sortable />
              <Column header="Days Left" body={daysLeftBody} sortable />
              <Column header="Expires At" body={expiresBody} sortable />
              <Column field="issuer" header="Issuer" />
              <Column header="Checked At" body={checkedBody} sortable />
              <Column header="Error" body={errorBody} />
            </DataTable>
          </div>
        </>
      )}
    </Dialog>
  );
}