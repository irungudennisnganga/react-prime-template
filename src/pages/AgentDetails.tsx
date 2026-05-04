import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";

import PageLoader from "../components/ui/PageLoader";
import { useAppToast } from "../components/ui/AppToast";
import { AgentDetails as AgentDetailsType, AgentHeartbeatLog, agentApi } from "../services/api";

function normalizeAgentStatus(status?: string) {
  const value = String(status || "pending").toLowerCase();

  if (value === "active" || value === "online") return "active";
  if (value === "offline" || value === "inactive") return "offline";

  return "pending";
}

function getAgentStatusClass(status?: string) {
  const normalized = normalizeAgentStatus(status);

  if (normalized === "active") return "agent-status-badge active";
  if (normalized === "offline") return "agent-status-badge offline";

  return "agent-status-badge pending";
}

function formatDate(date?: string) {
  if (!date) return "—";
  return new Date(date).toLocaleString();
}

function percent(value?: number) {
  return `${Number(value || 0).toFixed(2)}%`;
}

export default function AgentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useAppToast();

  const [details, setDetails] = useState<AgentDetailsType | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadDetails = async (nextPage = page, nextPageSize = pageSize) => {
    if (!id) return;

    try {
      setLoading(true);

      const data = await agentApi.details(id, nextPage, nextPageSize);
      setDetails(data);
      setPage(nextPage);
      setPageSize(nextPageSize);
    } catch (error: any) {
      showToast(
        "error",
        "Failed to load agent",
        error.response?.data?.message || "Could not fetch agent details."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails(1, 10);
  }, [id]);

  const cpuBody = (row: AgentHeartbeatLog) => {
    return <span className="agent-metric-pill cpu">{percent(row.cpu_usage)}</span>;
  };

  const memoryBody = (row: AgentHeartbeatLog) => {
    return (
      <span className="agent-metric-pill memory">
        {percent(row.memory_usage)}
      </span>
    );
  };

  const diskBody = (row: AgentHeartbeatLog) => {
    return <span className="agent-metric-pill disk">{percent(row.disk_usage)}</span>;
  };

  const timestampBody = (row: AgentHeartbeatLog) => {
    return (
      <div className="agent-date-cell">
        <strong>{formatDate(row.created_at)}</strong>
        <span>heartbeat captured</span>
      </div>
    );
  };

  const logs = details?.heartbeat_logs || [];
  const metrics = details?.metrics || {};

  return (
    <div className="agent-details-page">
      <div className="agent-details-top">
        <div>
          <button
            type="button"
            className="agent-back-btn"
            onClick={() => navigate("/agents")}
          >
            <i className="pi pi-arrow-left" />
            Back to agents
          </button>

          <h1>Agent details</h1>
          <p>View server identity, heartbeat status, latest usage and heartbeat logs.</p>
        </div>

        <button
          type="button"
          className="agent-refresh-circle"
          onClick={() => loadDetails(page, pageSize)}
        >
          Refresh
        </button>
      </div>

      {loading && !details ? (
        <PageLoader message="Loading agent details..." />
      ) : !details ? (
        <div className="empty-state">
          <i className="pi pi-server" />
          <h3>No agent found</h3>
          <p>The selected agent could not be loaded.</p>
        </div>
      ) : (
        <>
          <div className="agent-details-hero-grid">
            <section className="agent-identity-card">
              <div className="agent-identity-header">
                <h2>{details.name}</h2>
                <span className={getAgentStatusClass(details.status)}>
                  {normalizeAgentStatus(details.status)}
                </span>
              </div>

              <div className="agent-identity-grid">
                <div>
                  <span>Hostname</span>
                  <strong>{details.hostname || metrics.hostname || "—"}</strong>
                </div>

                <div>
                  <span>Site</span>
                  <strong>{details.site || "—"}</strong>
                </div>

                <div>
                  <span>Platform</span>
                  <strong>
                    {details.os || "unknown"} / {details.arch || "unknown"}
                  </strong>
                </div>

                <div>
                  <span>Last Seen</span>
                  <strong>{formatDate(details.last_seen_at)}</strong>
                </div>
              </div>
            </section>

            <section className="agent-status-card">
              <span>Agent Status</span>
              <strong>{normalizeAgentStatus(details.status)}</strong>
              <p>Current connectivity and heartbeat state of this agent.</p>

              <div>
                <small>Current Status</small>
                <span className={getAgentStatusClass(details.status)}>
                  {normalizeAgentStatus(details.status)}
                </span>
              </div>
            </section>
          </div>

          <div className="agent-metric-grid">
            <div className="agent-usage-card cpu">
              <span>CPU Usage</span>
              <strong>{percent(metrics.cpu_usage)}</strong>
              <small>Latest CPU consumption captured from agent heartbeat</small>
              <i className="pi pi-microchip" />
            </div>

            <div className="agent-usage-card memory">
              <span>Memory Usage</span>
              <strong>{percent(metrics.memory_usage)}</strong>
              <small>Latest RAM usage captured from agent heartbeat</small>
              <i className="pi pi-database" />
            </div>

            <div className="agent-usage-card disk">
              <span>Disk Usage</span>
              <strong>{percent(metrics.disk_usage)}</strong>
              <small>Latest storage usage captured from agent heartbeat</small>
              <i className="pi pi-hdd" />
            </div>
          </div>

          <section className="agent-heartbeat-snapshot">
            <h2>
              <i className="pi pi-clock" />
              Latest heartbeat snapshot
            </h2>

            <div>
              <article>
                <span>Hostname</span>
                <strong>{metrics.hostname || details.hostname || "—"}</strong>
              </article>

              <article>
                <span>IP</span>
                <strong>{metrics.ip || details.last_ip || "—"}</strong>
              </article>

              <article>
                <span>Version</span>
                <strong>{metrics.agent_version || details.version || "—"}</strong>
              </article>

              <article>
                <span>Captured At</span>
                <strong>{formatDate(metrics.created_at)}</strong>
              </article>
            </div>
          </section>

          <section className="agent-logs-card">
            <div className="agent-logs-header">
              <div>
                <h2>
                  <i className="pi pi-list" />
                  Agent heartbeat logs
                </h2>
                <p>Historical heartbeat entries captured for this agent.</p>
              </div>

              <span>
                Total records: {details.pagination?.total || logs.length}
              </span>
            </div>

            <DataTable
              value={logs}
              paginator
              rows={pageSize}
              first={(page - 1) * pageSize}
              totalRecords={details.pagination?.total || logs.length}
              lazy
              onPage={(event) => {
                const nextPage = Math.floor((event.first || 0) / (event.rows || 10)) + 1;
                const nextPageSize = event.rows || 10;
                loadDetails(nextPage, nextPageSize);
              }}
              rowsPerPageOptions={[5, 10, 20, 50]}
              scrollable
              scrollHeight="430px"
              stripedRows
              emptyMessage="No heartbeat logs found."
              className="agent-heartbeat-datatable"
            >
              <Column header="Timestamp" body={timestampBody} />
              <Column field="hostname" header="Hostname" />
              <Column field="ip" header="IP" />
              <Column header="CPU" body={cpuBody} />
              <Column header="Memory" body={memoryBody} />
              <Column header="Disk" body={diskBody} />
              <Column field="agent_version" header="Version" />
            </DataTable>
          </section>
        </>
      )}
    </div>
  );
}