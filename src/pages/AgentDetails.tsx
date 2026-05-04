import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";

import PageLoader from "../components/ui/PageLoader";
import { useAppToast } from "../components/ui/AppToast";
import {
  AgentDetails as AgentDetailsType,
  AgentHeartbeatLog,
  agentApi,
} from "../services/api";

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

function formatShortTime(date?: string) {
  if (!date) return "—";

  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function percent(value?: number) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function clampMetric(value?: number) {
  const numericValue = Number(value || 0);

  if (Number.isNaN(numericValue)) return 0;
  if (numericValue < 0) return 0;
  if (numericValue > 100) return 100;

  return numericValue;
}

type TrendPoint = {
  value: number;
  label: string;
  date: string;
};

type MetricTrendChartProps = {
  title: string;
  icon: string;
  type: "cpu" | "memory" | "disk";
  latestValue?: number;
  data: TrendPoint[];
};

function MetricTrendChart({
  title,
  icon,
  type,
  latestValue,
  data,
}: MetricTrendChartProps) {
  const width = 520;
  const height = 180;
  const paddingX = 28;
  const paddingTop = 20;
  const paddingBottom = 34;
  const graphWidth = width - paddingX * 2;
  const graphHeight = height - paddingTop - paddingBottom;

  const points = data.map((item, index) => {
    const x =
      data.length === 1
        ? width / 2
        : paddingX + (index / (data.length - 1)) * graphWidth;

    const y =
      paddingTop + graphHeight - (clampMetric(item.value) / 100) * graphHeight;

    return {
      ...item,
      x,
      y,
    };
  });

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath =
    points.length > 0
      ? `${path} L ${points[points.length - 1].x} ${
          height - paddingBottom
        } L ${points[0].x} ${height - paddingBottom} Z`
      : "";

  const average =
    data.length > 0
      ? data.reduce((sum, item) => sum + clampMetric(item.value), 0) / data.length
      : 0;

  const highest =
    data.length > 0
      ? Math.max(...data.map((item) => clampMetric(item.value)))
      : 0;

  return (
    <section className={`agent-trend-card ${type}`}>
      <div className="agent-trend-card-header">
        <div>
          <span className="agent-trend-icon">
            <i className={icon} />
          </span>

          <div>
            <h3>{title}</h3>
            <p>Heartbeat usage trend</p>
          </div>
        </div>

        <strong>{percent(latestValue)}</strong>
      </div>

      {data.length === 0 ? (
        <div className="agent-trend-empty">
          <i className="pi pi-chart-line" />
          <span>No heartbeat data available yet.</span>
        </div>
      ) : (
        <>
          <div className="agent-trend-chart-wrap">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="agent-trend-svg"
              role="img"
              aria-label={`${title} trend chart`}
            >
              <line
                x1={paddingX}
                y1={paddingTop}
                x2={paddingX}
                y2={height - paddingBottom}
                className="agent-trend-axis"
              />

              <line
                x1={paddingX}
                y1={height - paddingBottom}
                x2={width - paddingX}
                y2={height - paddingBottom}
                className="agent-trend-axis"
              />

              {[0, 25, 50, 75, 100].map((tick) => {
                const y =
                  paddingTop + graphHeight - (tick / 100) * graphHeight;

                return (
                  <g key={tick}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={width - paddingX}
                      y2={y}
                      className="agent-trend-grid-line"
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="agent-trend-y-label"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              {areaPath && <path d={areaPath} className="agent-trend-area" />}

              {path && <path d={path} className="agent-trend-line" />}

              {points.map((point, index) => (
                <g key={`${point.date}-${index}`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    className="agent-trend-dot"
                  />

                  {(index === 0 || index === points.length - 1) && (
                    <text
                      x={point.x}
                      y={height - 10}
                      textAnchor={index === 0 ? "start" : "end"}
                      className="agent-trend-x-label"
                    >
                      {point.label}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>

          <div className="agent-trend-stats">
            <div>
              <span>Average</span>
              <strong>{percent(average)}</strong>
            </div>

            <div>
              <span>Highest</span>
              <strong>{percent(highest)}</strong>
            </div>

            <div>
              <span>Samples</span>
              <strong>{data.length}</strong>
            </div>
          </div>
        </>
      )}
    </section>
  );
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

  const logs = details?.heartbeat_logs || [];
  const metrics = details?.metrics || {};

  const sortedTrendLogs = useMemo(() => {
    return [...logs]
      .filter((log) => log.created_at)
      .sort(
        (a, b) =>
          new Date(a.created_at || "").getTime() -
          new Date(b.created_at || "").getTime()
      );
  }, [logs]);

  const cpuTrendData = useMemo<TrendPoint[]>(() => {
    return sortedTrendLogs.map((log) => ({
      value: clampMetric(log.cpu_usage),
      label: formatShortTime(log.created_at),
      date: log.created_at || "",
    }));
  }, [sortedTrendLogs]);

  const memoryTrendData = useMemo<TrendPoint[]>(() => {
    return sortedTrendLogs.map((log) => ({
      value: clampMetric(log.memory_usage),
      label: formatShortTime(log.created_at),
      date: log.created_at || "",
    }));
  }, [sortedTrendLogs]);

  const diskTrendData = useMemo<TrendPoint[]>(() => {
    return sortedTrendLogs.map((log) => ({
      value: clampMetric(log.disk_usage),
      label: formatShortTime(log.created_at),
      date: log.created_at || "",
    }));
  }, [sortedTrendLogs]);

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

          <section className="agent-trends-section">
            <div className="agent-trends-header">
              <div>
                <h2>
                  <i className="pi pi-chart-line" />
                  Server usage trends
                </h2>
                <p>
                  CPU, memory and disk usage based on the heartbeat records currently loaded.
                </p>
              </div>

              <span>{logs.length} samples</span>
            </div>

            <div className="agent-trend-grid">
              <MetricTrendChart
                title="CPU Trend"
                icon="pi pi-server"
                type="cpu"
                latestValue={metrics.cpu_usage}
                data={cpuTrendData}
              />

              <MetricTrendChart
                title="Memory Trend"
                icon="pi pi-database"
                type="memory"
                latestValue={metrics.memory_usage}
                data={memoryTrendData}
              />

              <MetricTrendChart
                title="Disk Trend"
                icon="pi pi-box"
                type="disk"
                latestValue={metrics.disk_usage}
                data={diskTrendData}
              />
            </div>
          </section>

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

              <span>Total records: {details.pagination?.total || logs.length}</span>
            </div>

            <DataTable
              value={logs}
              paginator
              rows={pageSize}
              first={(page - 1) * pageSize}
              totalRecords={details.pagination?.total || logs.length}
              lazy
              onPage={(event) => {
                const nextPage =
                  Math.floor((event.first || 0) / (event.rows || 10)) + 1;
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