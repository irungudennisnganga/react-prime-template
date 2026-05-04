import { Dialog } from "primereact/dialog";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Monitor, MonitorHistoryItem } from "../../services/api";
import PageLoader from "./PageLoader";

type MonitorHistoryModalProps = {
  visible: boolean;
  monitor: Monitor | null;
  history: MonitorHistoryItem[];
  loading: boolean;
  onHide: () => void;
};

function normalizeHistoryStatus(status?: string) {
  const value = String(status || "").toLowerCase();

  if (value === "up" || value === "online") return "online";
  if (value === "down" || value === "offline") return "offline";
  return "pending";
}

function getStatusClass(status?: string) {
  const normalized = normalizeHistoryStatus(status);

  if (normalized === "online") return "status-badge online";
  if (normalized === "offline") return "status-badge offline";
  return "status-badge pending";
}

export default function MonitorHistoryModal({
  visible,
  monitor,
  history,
  loading,
  onHide,
}: MonitorHistoryModalProps) {
  const totalChecks = history.length;

  const onlineChecks = history.filter(
    (item) => normalizeHistoryStatus(item.status) === "online"
  ).length;

  const offlineChecks = history.filter(
    (item) => normalizeHistoryStatus(item.status) === "offline"
  ).length;

  const uptime = totalChecks > 0 ? Math.round((onlineChecks / totalChecks) * 100) : 0;

  const responseItems = history.filter(
    (item) =>
      typeof item.response_ms === "number" || typeof item.response_time === "number"
  );

  const averageResponse =
    responseItems.length > 0
      ? Math.round(
          responseItems.reduce(
            (sum, item) => sum + Number(item.response_ms || item.response_time || 0),
            0
          ) / responseItems.length
        )
      : 0;

  const statusBody = (row: MonitorHistoryItem) => {
    return <span className={getStatusClass(row.status)}>{normalizeHistoryStatus(row.status)}</span>;
  };

  const responseBody = (row: MonitorHistoryItem) => {
    return `${row.response_ms || row.response_time || 0}ms`;
  };

  const statusCodeBody = (row: MonitorHistoryItem) => {
    return row.status_code ? `HTTP ${row.status_code}` : "—";
  };

  const messageBody = (row: MonitorHistoryItem) => {
    return row.error || row.message || "Check completed";
  };

  const checkedAtBody = (row: MonitorHistoryItem) => {
    const dateValue = row.checked_at || row.created_at;
    return dateValue ? new Date(dateValue).toLocaleString() : "—";
  };

  return (
    <Dialog
      header={`Target History${monitor?.name ? ` - ${monitor.name}` : ""}`}
      visible={visible}
      style={{ width: "min(980px, 96vw)" }}
      modal
      draggable={false}
      className="history-dialog"
      onHide={onHide}
    >
      {loading ? (
        <PageLoader message="Loading target history..." />
      ) : (
        <>
          <div className="history-summary-grid">
            <div className="history-summary-card uptime">
              <span>Uptime</span>
              <strong>{uptime}%</strong>
            </div>

            <div className="history-summary-card online">
              <span>Online Checks</span>
              <strong>{onlineChecks}</strong>
            </div>

            <div className="history-summary-card offline">
              <span>Offline Checks</span>
              <strong>{offlineChecks}</strong>
            </div>

            <div className="history-summary-card response">
              <span>Avg Response</span>
              <strong>{averageResponse}ms</strong>
            </div>
          </div>

          <div className="history-table-card">
            <div className="history-table-header">
              <h3>Check Logs</h3>
              <p>Latest monitor checks and response information.</p>
            </div>

            <DataTable
              value={history}
              paginator
              rows={8}
              rowsPerPageOptions={[5, 8, 10, 20]}
              scrollable
              scrollHeight="360px"
              stripedRows
              emptyMessage="No history records found."
              className="history-datatable"
            >
              <Column field="status" header="Status" body={statusBody} sortable />
              <Column header="Response" body={responseBody} sortable />
              <Column header="Status Code" body={statusCodeBody} />
              <Column header="Message" body={messageBody} />
              <Column header="Checked At" body={checkedAtBody} sortable />
            </DataTable>
          </div>
        </>
      )}
    </Dialog>
  );
}