import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from 'axios'
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import "./AgentDetails.css";
import PageLoader from "../components/ui/PageLoader";
import { useAppToast } from "../components/ui/AppToast";
import {
  AgentDetails as AgentDetailsType,
  AgentHeartbeatLog,
  AgentLogFileReport,
  AgentDirectoryUsage,
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
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
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

function getUsageClass(value?: number) {
  const numeric = Number(value || 0);

  if (numeric >= 90) return "danger";
  if (numeric >= 75) return "warning";
  return "good";
}

function formatBytes(bytes?: number) {
  const value = Number(bytes || 0);

  if (!value || value <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1
  );

  const converted = value / Math.pow(1024, index);

  return `${converted.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
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
  const width = 620;
  const height = 210;
  const paddingX = 34;
  const paddingTop = 22;
  const paddingBottom = 38;
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
      ? data.reduce((sum, item) => sum + clampMetric(item.value), 0) /
        data.length
      : 0;

  const highest =
    data.length > 0
      ? Math.max(...data.map((item) => clampMetric(item.value)))
      : 0;

  const lowest =
    data.length > 0
      ? Math.min(...data.map((item) => clampMetric(item.value)))
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
            <p>Trend based on all loaded heartbeat records</p>
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

                  {(index === 0 ||
                    index === points.length - 1 ||
                    index === Math.floor(points.length / 2)) && (
                    <text
                      x={point.x}
                      y={height - 10}
                      textAnchor={
                        index === 0
                          ? "start"
                          : index === points.length - 1
                            ? "end"
                            : "middle"
                      }
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
              <span>Lowest</span>
              <strong>{percent(lowest)}</strong>
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

      const data = await agentApi.details(id, nextPage, nextPageSize, 1000);
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
  const trendLogs =
    details?.heartbeat_trend_logs && details.heartbeat_trend_logs.length > 0
      ? details.heartbeat_trend_logs
      : logs;

  const metrics = details?.metrics || {};
  const diskLatest = details?.disk_maintenance_latest;
  const storageSummary = details?.storage_summary || {};
  const topDirectories = details?.top_directories || [];
  const logFiles = details?.log_files || [];
  const diskReports = details?.disk_maintenance_reports || [];

  const isPending = normalizeAgentStatus(details?.status) === "pending";

  const sortedTrendLogs = useMemo(() => {
    return [...trendLogs]
      .filter((log) => log.created_at)
      .sort(
        (a, b) =>
          new Date(a.created_at || "").getTime() -
          new Date(b.created_at || "").getTime()
      );
  }, [trendLogs]);

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

  const directorySizeBody = (row: AgentDirectoryUsage) => {
    return <span className="agent-metric-pill disk">{formatBytes(row.size_bytes)}</span>;
  };

  const logFileSizeBody = (row: AgentLogFileReport) => {
    return <span className="agent-metric-pill disk">{formatBytes(row.size_bytes)}</span>;
  };

  const logModifiedBody = (row: AgentLogFileReport) => {
    return (
      <div className="agent-date-cell">
        <strong>{formatDate(row.modified_at)}</strong>
        <span>last modified</span>
      </div>
    );
  };

  const candidateBody = (row: AgentLogFileReport) => {
    return (
      <span className={`agent-inline-badge ${row.is_candidate ? "warning" : "neutral"}`}>
        {row.is_candidate ? "Candidate" : "Normal"}
      </span>
    );
  };

  const truncatedBody = (row: AgentLogFileReport) => {
    return (
      <span className={`agent-inline-badge ${row.truncated ? "success" : "neutral"}`}>
        {row.truncated ? "Truncated" : "No"}
      </span>
    );
  };

  const diskUsage = Number(metrics.disk_usage || 0);

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
          <p>
            View identity, heartbeat metrics, full usage trends, storage overview,
            top directories, log files and disk maintenance history.
          </p>
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
          {isPending ? (
            <section className="agent-pending-setup-card">
              <div>
                <span className="agent-pending-icon">
                  <i className="pi pi-info-circle" />
                </span>

                <div>
                  <h2>Agent created, waiting for installation</h2>
                  <p>
                    This agent has been created but has not sent its first heartbeat yet.
                    Install and start the agent on the target server to begin collecting CPU,
                    memory, disk, services, backups and system health data.
                  </p>
                </div>
              </div>

              <div className="agent-pending-grid">
                <article>
                  <span>Agent Name</span>
                  <strong>{details.name || "—"}</strong>
                </article>

                <article>
                  <span>Site</span>
                  <strong>{details.site || "—"}</strong>
                </article>

                <article>
                  <span>Status</span>
                  <strong>{normalizeAgentStatus(details.status)}</strong>
                </article>

                <article>
                  <span>Last Seen</span>
                  <strong>{formatDate(details.last_seen_at)}</strong>
                </article>
              </div>
            </section>
          ) : null}

          <div className="agent-details-hero-grid">
            <section className="agent-identity-card bright">
              <div className="agent-identity-header">
                <h2>{details.name}</h2>
                <span className={getAgentStatusClass(details.status)}>
                  {normalizeAgentStatus(details.status)}
                </span>
              </div>

              <div className="agent-identity-grid">
                <div>
                  <span>Hostname</span>
                  <strong>
                    {details.hostname ||
                      metrics.hostname ||
                      diskLatest?.hostname ||
                      (isPending ? "Waiting for installation" : "—")}
                  </strong>
                </div>

                <div>
                  <span>Site</span>
                  <strong>{details.site || "—"}</strong>
                </div>

                <div>
                  <span>Platform</span>
                  <strong>
                    {details.os || metrics.os || "unknown"} /{" "}
                    {details.arch || metrics.arch || "unknown"}
                  </strong>
                </div>

                <div>
                  <span>Last Seen</span>
                  <strong>{formatDate(details.last_seen_at)}</strong>
                </div>
              </div>
            </section>

            <section className="agent-status-card bright">
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

          <div className="agent-metric-grid bright-grid">
            
            <div className="agent-usage-card memory bright-card">
              <span>Memory Usage</span>
              <strong>{percent(metrics.memory_usage)}</strong>
              <small>Latest RAM usage captured from heartbeat</small>
              <i className="pi pi-database" />
            </div>

            <div className="agent-usage-card disk bright-card">
              <span>Disk Usage</span>
              <strong>{percent(metrics.disk_usage)}</strong>
              <small>Latest storage usage captured from heartbeat</small>
              <i className="pi pi-server" />
            </div>

            <div className="agent-usage-card storage bright-card">
              <span>Reported Storage</span>
              <strong>{formatBytes(storageSummary.total_reported_size_bytes)}</strong>
              <small>Total size reported by latest disk maintenance scan</small>
              <i className="pi pi-folder-open" />
            </div>
          </div>

          <section className="agent-space-overview-card bright-card">
            <div className="agent-space-overview-header">
              <div>
                <h2>
                  <i className="pi pi-hdd" />
                  Server space overview
                </h2>
                <p>Quick storage and maintenance summary for this server.</p>
              </div>

              <span className={`agent-space-score ${getUsageClass(diskUsage)}`}>
                {percent(diskUsage)}
              </span>
            </div>

            <div className="agent-space-meter">
              <span style={{ width: `${Math.min(diskUsage, 100)}%` }} />
            </div>

            <div className="agent-space-grid">
              <article>
                <span>Status</span>
                <strong>
                  {diskUsage >= 90
                    ? "Critical"
                    : diskUsage >= 75
                      ? "Warning"
                      : diskUsage > 0
                        ? "Healthy"
                        : "Awaiting heartbeat"}
                </strong>
              </article>

              <article>
                <span>Reported Size</span>
                <strong>{formatBytes(storageSummary.total_reported_size_bytes)}</strong>
              </article>

              <article>
                <span>Top Directories</span>
                <strong>{storageSummary.directories_count || 0}</strong>
              </article>

              <article>
                <span>Log Files</span>
                <strong>{storageSummary.log_files_count || 0}</strong>
              </article>

              <article>
                <span>Log Candidates</span>
                <strong>{storageSummary.total_candidates || 0}</strong>
              </article>

              <article>
                <span>Truncated</span>
                <strong>{storageSummary.total_truncated || 0}</strong>
              </article>

              <article>
                <span>Errors</span>
                <strong>{storageSummary.total_errors || 0}</strong>
              </article>

              <article>
                <span>Captured At</span>
                <strong>{formatDate(storageSummary.captured_at)}</strong>
              </article>
            </div>
          </section>

          <section className="agent-storage-insights-grid">
            <div className="agent-insight-card bright-card">
              <div className="agent-insight-top">
                <span className="agent-insight-icon">
                  <i className="pi pi-folder" />
                </span>
                <div>
                  <h3>Largest directory</h3>
                  <p>Main directory consuming the most space</p>
                </div>
              </div>

              <strong className="agent-insight-value">
                {storageSummary.largest_directory?.path || "—"}
              </strong>
              <small>{formatBytes(storageSummary.largest_directory?.size_bytes)}</small>
            </div>

            <div className="agent-insight-card bright-card">
              <div className="agent-insight-top">
                <span className="agent-insight-icon">
                  <i className="pi pi-file" />
                </span>
                <div>
                  <h3>Largest log file</h3>
                  <p>Heaviest log file in the latest maintenance scan</p>
                </div>
              </div>

              <strong className="agent-insight-value">
                {storageSummary.largest_log_file?.path || "—"}
              </strong>
              <small>{formatBytes(storageSummary.largest_log_file?.size_bytes)}</small>
            </div>

            <div className="agent-insight-card bright-card">
              <div className="agent-insight-top">
                <span className="agent-insight-icon">
                  <i className="pi pi-chart-line" />
                </span>
                <div>
                  <h3>Trend samples</h3>
                  <p>Heartbeat points used for the chart</p>
                </div>
              </div>

              <strong className="agent-insight-value">
                {details.trend_meta?.returned_count || sortedTrendLogs.length}
              </strong>
              <small>Loaded for graph analysis</small>
            </div>
          </section>

          <section className="agent-trends-section">
            <div className="agent-trends-header">
              <div>
                <h2>
                  <i className="pi pi-chart-line" />
                  Server usage trends
                </h2>
                <p>
                  CPU, memory and disk usage based on many heartbeat records, not only the table page.
                </p>
              </div>

              <span>{details.trend_meta?.returned_count || sortedTrendLogs.length} trend samples</span>
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

          <section className="agent-heartbeat-snapshot bright-card">
            <h2>
              <i className="pi pi-clock" />
              Latest heartbeat snapshot
            </h2>

            <div>
              <article>
                <span>Hostname</span>
                <strong>{metrics.hostname || details.hostname || "Awaiting heartbeat"}</strong>
              </article>

              <article>
                <span>IP Address</span>
                <strong>{metrics.ip || details.last_ip || "Awaiting heartbeat"}</strong>
              </article>

              <article>
                <span>Agent Version</span>
                <strong>{metrics.agent_version || details.version || "Not reported yet"}</strong>
              </article>

              <article>
                <span>Operating System</span>
                <strong>
                  {details.os || metrics.os || "unknown"} /{" "}
                  {details.arch || metrics.arch || "unknown"}
                </strong>
              </article>

              <article>
                <span>CPU Usage</span>
                <strong>{percent(metrics.cpu_usage)}</strong>
              </article>

              <article>
                <span>Memory Usage</span>
                <strong>{percent(metrics.memory_usage)}</strong>
              </article>

              <article>
                <span>Disk Usage</span>
                <strong>{percent(metrics.disk_usage)}</strong>
              </article>

              <article>
                <span>Captured At</span>
                <strong>{formatDate(metrics.created_at || details.last_seen_at)}</strong>
              </article>
            </div>
          </section>

          <section className="agent-logs-card bright-card">
            <div className="agent-logs-header">
              <div>
                <h2>
                  <i className="pi pi-folder-open" />
                  Top directories by storage
                </h2>
                <p>Largest directories reported by the latest disk maintenance scan.</p>
              </div>

              <span>Total: {topDirectories.length}</span>
            </div>

            <DataTable
              value={topDirectories}
              scrollable
              scrollHeight="330px"
              stripedRows
              emptyMessage="No top directory data found."
              className="agent-heartbeat-datatable"
            >
              <Column field="path" header="Directory" />
              <Column header="Size" body={directorySizeBody} />
            </DataTable>
          </section>

          <section className="agent-logs-card bright-card">
            <div className="agent-logs-header">
              <div>
                <h2>
                  <i className="pi pi-file" />
                  Largest log files
                </h2>
                <p>Log files found during the latest disk maintenance scan.</p>
              </div>

              <span>Total: {logFiles.length}</span>
            </div>

            <DataTable
              value={logFiles}
              paginator
              rows={10}
              rowsPerPageOptions={[5, 10, 20, 50]}
              scrollable
              scrollHeight="420px"
              stripedRows
              emptyMessage="No log file data found."
              className="agent-heartbeat-datatable"
            >
              <Column field="path" header="Log File" style={{ minWidth: "360px" }} />
              <Column header="Size" body={logFileSizeBody} />
              <Column header="Modified At" body={logModifiedBody} />
              <Column header="Candidate" body={candidateBody} />
              <Column header="Truncated" body={truncatedBody} />
            </DataTable>
          </section>

          <section className="agent-logs-card bright-card">
            <div className="agent-logs-header">
              <div>
                <h2>
                  <i className="pi pi-history" />
                  Disk maintenance history
                </h2>
                <p>Recent disk maintenance reports received from the agent.</p>
              </div>

              <span>Total loaded: {diskReports.length}</span>
            </div>

            <DataTable
              value={diskReports}
              scrollable
              scrollHeight="330px"
              stripedRows
              emptyMessage="No disk maintenance history found."
              className="agent-heartbeat-datatable"
            >
              <Column
                header="Captured At"
                body={(row: any) => formatDate(row.created_at)}
              />
              <Column field="hostname" header="Hostname" />
              <Column
                header="Directories"
                body={(row: any) => row.top_directories?.length || 0}
              />
              <Column
                header="Log Files"
                body={(row: any) => row.log_files?.length || 0}
              />
              <Column field="total_candidates" header="Candidates" />
              <Column field="total_truncated" header="Truncated" />
              <Column field="total_errors" header="Errors" />
            </DataTable>
          </section>

          <section className="agent-logs-card bright-card">
            <div className="agent-logs-header">
              <div>
                <h2>
                  <i className="pi pi-list" />
                  Agent heartbeat logs
                </h2>
                <p>Paginated heartbeat entries captured for this agent.</p>
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