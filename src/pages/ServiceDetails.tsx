import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";

import PageLoader from "../components/ui/PageLoader";
import { useAppToast } from "../components/ui/AppToast";
import {
  AgentServiceDetails,
  AgentServiceLog,
  agentServiceApi,
  getAgentServiceType,
} from "../services/api";

function normalizeServiceState(state?: string) {
  const value = String(state || "pending").toLowerCase();

  if (value === "up" || value === "healthy") return "up";
  if (value === "down" || value === "unhealthy") return "down";
  if (value === "unknown") return "unknown";

  return "pending";
}

function stateClass(state?: string) {
  const normalized = normalizeServiceState(state);

  if (normalized === "up") return "service-state-badge up";
  if (normalized === "down") return "service-state-badge down";
  if (normalized === "unknown") return "service-state-badge pending";

  return "service-state-badge pending";
}

function formatDate(date?: string) {
  if (!date) return "—";

  return new Date(date).toLocaleString();
}

function getResponseMs(log: AgentServiceLog) {
  return Number(log.response_ms || log.ResponseMS || 0);
}

function getRestarted(log: AgentServiceLog) {
  if (typeof log.restarted === "boolean") return log.restarted;
  if (typeof log.Restarted === "boolean") return log.Restarted;

  return false;
}

function getLogState(log: AgentServiceLog) {
  return log.state || log.State || "pending";
}

function getError(log: AgentServiceLog) {
  return log.error || log.Error || "—";
}

export default function ServiceDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useAppToast();

  const [details, setDetails] = useState<AgentServiceDetails | null>(null);
  const [logs, setLogs] = useState<AgentServiceLog[]>([]);
  const [loading, setLoading] = useState(false);

  const computedStats = useMemo(() => {
    const total = logs.length;

    const upLogs = logs.filter(
      (log) => normalizeServiceState(getLogState(log)) === "up"
    ).length;

    const downLogs = logs.filter(
      (log) => normalizeServiceState(getLogState(log)) === "down"
    ).length;

    const restartCount = logs.filter((log) => getRestarted(log)).length;

    const totalResponse = logs.reduce((sum, log) => sum + getResponseMs(log), 0);

    const avgResponse = total > 0 ? Math.round(totalResponse / total) : 0;

    const uptime = total > 0 ? Number(((upLogs / total) * 100).toFixed(1)) : 0;

    const downtime =
      total > 0 ? Number(((downLogs / total) * 100).toFixed(1)) : 0;

    const estimatedDowntimeMinutes = downLogs;

    return {
      total,
      upLogs,
      downLogs,
      restartCount,
      avgResponse,
      uptime,
      downtime,
      estimatedDowntimeMinutes,
    };
  }, [logs]);

  const loadDetails = async () => {
    if (!id) {
      showToast(
        "error",
        "Failed to load service",
        "Service ID is missing from the route."
      );
      return;
    }

    try {
      setLoading(true);

      const [serviceDetails, serviceLogs] = await Promise.all([
        agentServiceApi.details(id),
        agentServiceApi.logs(id, 100),
      ]);

      setDetails(serviceDetails);
      setLogs(serviceLogs.logs);
    } catch (error: any) {
      showToast(
        "error",
        "Failed to load service",
        error.response?.data?.message ||
          error.message ||
          "Could not fetch service details."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [id]);

  const currentState = normalizeServiceState(
    details?.state || details?.last_known_state
  );

  const stateBody = (row: AgentServiceLog) => {
    const state = normalizeServiceState(getLogState(row));

    return <span className={stateClass(state)}>{state}</span>;
  };

  const responseBody = (row: AgentServiceLog) => {
    return `${getResponseMs(row)} ms`;
  };

  const restartedBody = (row: AgentServiceLog) => {
    return getRestarted(row) ? "Yes" : "No";
  };

  const checkedAtBody = (row: AgentServiceLog) => {
    return formatDate(
      row.checked_at || row.CheckedAt || row.created_at || row.CreatedAt
    );
  };

  const errorBody = (row: AgentServiceLog) => {
    return getError(row);
  };

  return (
    <div className="service-details-page">
      <div className="service-details-top">
        <div>
          <button
            type="button"
            className="agent-back-btn"
            onClick={() => navigate("/services")}
          >
            <i className="pi pi-arrow-left" />
            Back
          </button>

          <h1>{details?.name || "Service Details"}</h1>
          <p>Detailed service uptime, downtime, and logs in East Africa Time.</p>
        </div>

        <button type="button" className="secondary-btn" onClick={loadDetails}>
          <i className="pi pi-refresh" />
          Refresh
        </button>
      </div>

      {loading && !details ? (
        <PageLoader message="Loading service details..." />
      ) : !details ? (
        <div className="empty-state">
          <i className="pi pi-cog" />
          <h3>No service found</h3>
          <p>The selected service could not be loaded.</p>
        </div>
      ) : (
        <>
          <div className="service-detail-stats-grid">
            <div className="service-detail-stat uptime">
              <span>Uptime</span>
              <strong>{computedStats.uptime}%</strong>
              <small>{computedStats.upLogs} up log(s)</small>
            </div>

            <div className="service-detail-stat downtime">
              <span>Downtime</span>
              <strong>{computedStats.downtime}%</strong>
              <small>{computedStats.downLogs} down log(s)</small>
            </div>

            <div className="service-detail-stat response">
              <span>Avg Response</span>
              <strong>{computedStats.avgResponse} ms</strong>
              <small>Average latency</small>
            </div>

            <div className="service-detail-stat restarts">
              <span>Restarts</span>
              <strong>{computedStats.restartCount}</strong>
              <small>Restart events observed</small>
            </div>
          </div>

          <div className="service-details-grid">
            <section className="service-profile-card">
              <div className="service-profile-header">
                <div className="service-icon large">
                  <i className="pi pi-database" />
                </div>

                <div>
                  <h2>{details.name}</h2>

                  <p>
                    {details.host}:{details.port}
                  </p>

                  <div className="service-profile-pills">
                    <span
                      className={`service-type-pill ${getAgentServiceType(
                        details
                      )}`}
                    >
                      {getAgentServiceType(details)}
                    </span>

                    <span className={stateClass(currentState)}>
                      {currentState}
                    </span>

                    <span
                      className={
                        details.auto_restart
                          ? "service-config-badge enabled"
                          : "service-config-badge disabled"
                      }
                    >
                      {details.auto_restart
                        ? "Auto-Restart Enabled"
                        : "Auto-Restart Disabled"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="service-profile-grid">
                <div>
                  <span>System Service</span>
                  <strong>{details.system_service || "—"}</strong>
                </div>

                <div>
                  <span>Last Checked</span>
                  <strong>{formatDate(details.last_checked_at)}</strong>
                </div>

                <div>
                  <span>Last Restarted</span>
                  <strong>{formatDate(details.last_restarted_at)}</strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>{details.status || "—"}</strong>
                </div>
              </div>
            </section>

            <aside className="service-breakdown-card">
              <h3>Service Breakdown</h3>

              <div className="breakdown-box total">
                <span>Total Checks</span>
                <strong>{computedStats.total}</strong>
              </div>

              <div className="breakdown-box downtime">
                <span>Estimated Downtime</span>
                <strong>{computedStats.estimatedDowntimeMinutes}m</strong>
              </div>

              <div className="breakdown-box state">
                <span>Current State</span>
                <strong>{currentState}</strong>
              </div>
            </aside>
          </div>

          <section className="service-logs-card">
            <div className="service-logs-header">
              <div>
                <h2>Service Logs</h2>
                <p>Showing events in East Africa Time.</p>
              </div>

              <span>{logs.length} total logs</span>
            </div>

            <DataTable
              value={logs}
              paginator
              rows={10}
              rowsPerPageOptions={[5, 10, 20, 50]}
              scrollable
              scrollHeight="430px"
              stripedRows
              emptyMessage="No service logs found."
              className="service-logs-datatable"
            >
              <Column header="Checked At (EAT)" body={checkedAtBody} />

              <Column header="State" body={stateBody} />

              <Column header="Response" body={responseBody} />

              <Column header="Restarted" body={restartedBody} />

              <Column header="Error" body={errorBody} />
            </DataTable>
          </section>
        </>
      )}
    </div>
  );
}