import { useEffect, useMemo, useState } from "react";
import { Column } from "primereact/column";
import { DataTable, DataTableFilterMeta } from "primereact/datatable";
import { FilterMatchMode } from "primereact/api";
import { useNavigate } from "react-router-dom";

import PageLoader from "../components/ui/PageLoader";
import CreateAgentModal from "../components/ui/CreateAgentModal";
import AgentActionsMenu from "../components/ui/AgentActionsMenu";
import { useAppToast } from "../components/ui/AppToast";
import {
  Agent,
  CreateAgentPayload,
  agentApi,
  getAgentId,
} from "../services/api";

type DirectoryUsage = {
  path?: string;
  size_bytes?: number;
};

type DiskMaintenanceReport = {
  hostname?: string;
  top_directories?: DirectoryUsage[];
  total_truncated?: number;
  total_candidates?: number;
  total_errors?: number;
  created_at?: string;
};

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

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleString();
}

function percent(value?: number) {
  const numeric = Number(value || 0);
  return `${numeric.toFixed(2)}%`;
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

function getAgentMetric(
  agent: Agent,
  key: "cpu_usage" | "memory_usage" | "disk_usage"
) {
  const anyAgent = agent as any;

  return Number(
    anyAgent?.metrics?.[key] ??
      anyAgent?.latest_metrics?.[key] ??
      anyAgent?.[key] ??
      0
  );
}

function getUsageClass(value: number) {
  if (value >= 90) return "danger";
  if (value >= 75) return "warning";
  return "good";
}

function getAgentStorageReport(agent: Agent): DiskMaintenanceReport | null {
  const anyAgent = agent as any;

  return (
    anyAgent?.latest_disk_maintenance ||
    anyAgent?.disk_maintenance ||
    anyAgent?.latest_storage_report ||
    anyAgent?.storage_report ||
    anyAgent?.disk_maintenance_report ||
    null
  );
}

function getStorageDirectories(agent: Agent): DirectoryUsage[] {
  const report = getAgentStorageReport(agent);
  return Array.isArray(report?.top_directories) ? report.top_directories : [];
}

function getTotalReportedStorageBytes(agent: Agent) {
  return getStorageDirectories(agent).reduce((sum, item) => {
    return sum + Number(item?.size_bytes || 0);
  }, 0);
}

function getLargestDirectory(agent: Agent) {
  const directories = getStorageDirectories(agent);

  if (!directories.length) return null;

  return [...directories].sort(
    (a, b) => Number(b?.size_bytes || 0) - Number(a?.size_bytes || 0)
  )[0];
}

function hasAnyServerUsage(agent: Agent) {
  const cpu = getAgentMetric(agent, "cpu_usage");
  const memory = getAgentMetric(agent, "memory_usage");
  const disk = getAgentMetric(agent, "disk_usage");
  const storageBytes = getTotalReportedStorageBytes(agent);

  return cpu > 0 || memory > 0 || disk > 0 || storageBytes > 0;
}

function buildFallbackInstallCommand(response: any) {
  const agentId = response?.id || response?.agent_id || "<agent-id>";
  const token = response?.token || "<agent-token>";

  return `curl -fsSL https://opsradar.tekvancesolutions.co.ke/install-agent.sh | sudo bash -s -- --server https://api-opsradar.tekvancesolutions.co.ke --agent-id ${agentId} --token ${token}`;
}

export default function AgentControl() {
  const navigate = useNavigate();
  const { showToast } = useAppToast();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [generatedCommand, setGeneratedCommand] = useState("");

  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    site: { value: null, matchMode: FilterMatchMode.CONTAINS },
    hostname: { value: null, matchMode: FilterMatchMode.CONTAINS },
    status: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const filteredAgents = useMemo(() => {
    const search = globalFilter.trim().toLowerCase();
    const status = statusFilter.trim().toLowerCase();

    return agents.filter((agent) => {
      const cpu = getAgentMetric(agent, "cpu_usage");
      const memory = getAgentMetric(agent, "memory_usage");
      const disk = getAgentMetric(agent, "disk_usage");
      const storageReport = getAgentStorageReport(agent);
      const largestDirectory = getLargestDirectory(agent);
      const totalStorageBytes = getTotalReportedStorageBytes(agent);

      const matchesSearch =
        !search ||
        [
          agent.name,
          agent.site,
          agent.hostname,
          agent.last_ip,
          agent.version,
          agent.status,
          cpu,
          memory,
          disk,
          storageReport?.hostname,
          storageReport?.created_at,
          largestDirectory?.path,
          formatBytes(largestDirectory?.size_bytes),
          formatBytes(totalStorageBytes),
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);

      const matchesStatus =
        !status || normalizeAgentStatus(agent.status) === status;

      return matchesSearch && matchesStatus;
    });
  }, [agents, globalFilter, statusFilter]);

  const summary = useMemo(() => {
    const total = filteredAgents.length;

    const active = filteredAgents.filter(
      (agent) => normalizeAgentStatus(agent.status) === "active"
    ).length;

    const pending = filteredAgents.filter(
      (agent) => normalizeAgentStatus(agent.status) === "pending"
    ).length;

    const highDisk = filteredAgents.filter(
      (agent) => getAgentMetric(agent, "disk_usage") >= 75
    ).length;

    const withStorageReports = filteredAgents.filter(
      (agent) => getTotalReportedStorageBytes(agent) > 0
    ).length;

    return { total, active, pending, highDisk, withStorageReports };
  }, [filteredAgents]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const data = await agentApi.view();
      setAgents(data);
    } catch (error: any) {
      showToast(
        "error",
        "Failed to load agents",
        error.response?.data?.message || "Could not fetch VPS agents."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const handleCreateAgent = async (payload: CreateAgentPayload) => {
    try {
      setCreating(true);
      setGeneratedCommand("");

      const response = await agentApi.create(payload);

      const command =
        response.install_command ||
        response.command ||
        buildFallbackInstallCommand(response);

      setGeneratedCommand(command);

      showToast(
        "success",
        "Agent created",
        "Install command generated successfully."
      );

      await loadAgents();
    } catch (error: any) {
      showToast(
        "error",
        "Agent creation failed",
        error.response?.data?.message || "Could not create agent."
      );
    } finally {
      setCreating(false);
    }
  };

  const copyCommand = async () => {
    if (!generatedCommand) return;

    await navigator.clipboard.writeText(generatedCommand);

    showToast(
      "success",
      "Copied",
      "Agent install command copied to clipboard."
    );
  };

  const handleGlobalFilterChange = (value: string) => {
    setGlobalFilter(value);

    setFilters((prev) => ({
      ...prev,
      global: {
        value,
        matchMode: FilterMatchMode.CONTAINS,
      },
    }));
  };

  const openAgentDetails = (agent: Agent) => {
    const id = getAgentId(agent);

    if (!id) {
      showToast("warn", "Missing agent ID", "This agent does not have an ID.");
      return;
    }

    navigate(`/agents/${id}`);
  };

  const agentTemplate = (agent: Agent) => {
    return (
      <div className="agent-name-cell">
        <div className="agent-avatar">
          <i className="pi pi-server" />
        </div>

        <div>
          <strong>{agent.name}</strong>
          <span>ID: {getAgentId(agent) || "—"}</span>
        </div>
      </div>
    );
  };

  const hostTemplate = (agent: Agent) => {
    const isPending = normalizeAgentStatus(agent.status) === "pending";
    const storageReport = getAgentStorageReport(agent);

    return (
      <div className="agent-host-cell">
        <strong>
          {agent.hostname ||
            storageReport?.hostname ||
            (isPending ? "Waiting for installation" : "Unknown host")}
        </strong>

        <span>
          {agent.os || "unknown"} / {agent.arch || "unknown"} /{" "}
          {agent.last_ip || "no ip"}
        </span>
      </div>
    );
  };

  const usageTemplate = (agent: Agent) => {
    const cpu = getAgentMetric(agent, "cpu_usage");
    const memory = getAgentMetric(agent, "memory_usage");
    const disk = getAgentMetric(agent, "disk_usage");

    if (!hasAnyServerUsage(agent)) {
      return (
        <div className="agent-usage-mini empty">
          <span>Awaiting heartbeat</span>
          <small>Usage will appear after agent starts</small>
        </div>
      );
    }

    return (
      <div className="agent-usage-mini">
        <div>
          <span>CPU</span>
          <strong className={getUsageClass(cpu)}>{percent(cpu)}</strong>
        </div>

        <div>
          <span>RAM</span>
          <strong className={getUsageClass(memory)}>{percent(memory)}</strong>
        </div>

        <div>
          <span>Disk</span>
          <strong className={getUsageClass(disk)}>{percent(disk)}</strong>
        </div>
      </div>
    );
  };

  const storageTemplate = (agent: Agent) => {
    const storageReport = getAgentStorageReport(agent);
    const directories = getStorageDirectories(agent);
    const largestDirectory = getLargestDirectory(agent);
    const totalReportedStorageBytes = getTotalReportedStorageBytes(agent);

    if (!storageReport || directories.length === 0) {
      return (
        <div className="agent-storage-cell empty">
          <strong>Awaiting storage report</strong>
          <span>No disk maintenance report yet</span>
        </div>
      );
    }

    return (
      <div className="agent-storage-cell">
        <div className="agent-storage-main">
          <strong>{formatBytes(totalReportedStorageBytes)}</strong>
          <span>{directories.length} top directorie(s)</span>
        </div>

        <div className="agent-storage-path">
          <small>Largest</small>
          <span title={largestDirectory?.path || ""}>
            {largestDirectory?.path || "—"} ·{" "}
            {formatBytes(largestDirectory?.size_bytes)}
          </span>
        </div>

        <div className="agent-storage-meta">
          <span>
            Candidates: {storageReport.total_candidates || 0}
          </span>
          <span>
            Truncated: {storageReport.total_truncated || 0}
          </span>
          <span>
            Errors: {storageReport.total_errors || 0}
          </span>
        </div>
      </div>
    );
  };

  const versionTemplate = (agent: Agent) => {
    return <span className="agent-version-pill">{agent.version || "—"}</span>;
  };

  const statusTemplate = (agent: Agent) => {
    const status = normalizeAgentStatus(agent.status);

    return <span className={getAgentStatusClass(status)}>{status}</span>;
  };

  const lastSeenTemplate = (agent: Agent) => {
    const storageReport = getAgentStorageReport(agent);

    return (
      <div className="agent-date-cell">
        <strong>{formatDate(agent.last_seen_at)}</strong>
        <span>
          Storage:{" "}
          {storageReport?.created_at
            ? formatDate(storageReport.created_at)
            : "not reported"}
        </span>
      </div>
    );
  };

  const actionTemplate = (agent: Agent) => {
    return <AgentActionsMenu agent={agent} onView={openAgentDetails} />;
  };

  return (
    <div className="agent-page">
      <div className="agent-page-top">
        <div>
          <span className="agent-module-pill">
            <i className="pi pi-server" />
            OpsRadar Agents Overview
          </span>

          <h1>Agent Control</h1>
          <p>
            Create, enroll, monitor VPS agents, and view heartbeat plus storage
            usage before opening details.
          </p>
        </div>

        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            setGeneratedCommand("");
            setCreateVisible(true);
          }}
        >
          <i className="pi pi-plus" />
          Create agent
        </button>
      </div>

      <div className="agent-summary-grid">
        <div className="agent-summary-card total">
          <span>Total Agents</span>
          <strong>{summary.total}</strong>
          <small>All matching agents</small>
        </div>

        <div className="agent-summary-card active">
          <span>Active</span>
          <strong>{summary.active}</strong>
          <small>Sending heartbeats</small>
        </div>

        <div className="agent-summary-card pending">
          <span>Pending</span>
          <strong>{summary.pending}</strong>
          <small>Awaiting installation</small>
        </div>

        <div className="agent-summary-card disk">
          <span>High Disk</span>
          <strong>{summary.highDisk}</strong>
          <small>Disk usage above 75%</small>
        </div>

        <div className="agent-summary-card disk">
          <span>Storage Reports</span>
          <strong>{summary.withStorageReports}</strong>
          <small>Agents with disk maintenance data</small>
        </div>
      </div>

      <section className="agent-table-card">
        <div className="agent-toolbar">
          <div className="agent-search">
            <i className="pi pi-search" />
            <input
              value={globalFilter}
              placeholder="Search by name, site, host, status, usage, storage path..."
              onChange={(event) => handleGlobalFilterChange(event.target.value)}
            />
          </div>

          <div className="agent-toolbar-actions">
            <label>
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="offline">Offline</option>
                <option value="pending">Pending</option>
              </select>
            </label>

            <button type="button" className="secondary-btn" onClick={loadAgents}>
              <i className="pi pi-refresh" />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <PageLoader message="Loading agents..." />
        ) : (
          <>
            <div className="agent-desktop-table">
              <DataTable
                value={filteredAgents}
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 20, 50]}
                filters={filters}
                globalFilterFields={[
                  "name",
                  "site",
                  "hostname",
                  "status",
                  "version",
                ]}
                sortMode="multiple"
                removableSort
                scrollable
                scrollHeight="560px"
                stripedRows
                dataKey="id"
                emptyMessage="No agents found."
                className="agent-datatable"
              >
                <Column
                  field="name"
                  header="Agent"
                  body={agentTemplate}
                  sortable
                  filter
                  style={{ minWidth: "280px" }}
                />

                <Column
                  field="site"
                  header="Site"
                  sortable
                  filter
                  style={{ minWidth: "140px" }}
                />

                <Column
                  field="hostname"
                  header="Host"
                  body={hostTemplate}
                  sortable
                  filter
                  style={{ minWidth: "280px" }}
                />

                <Column
                  header="Server Usage"
                  body={usageTemplate}
                  style={{ minWidth: "250px" }}
                />

                <Column
                  header="Storage Report"
                  body={storageTemplate}
                  style={{ minWidth: "340px" }}
                />

                <Column
                  field="version"
                  header="Version"
                  body={versionTemplate}
                  sortable
                  style={{ minWidth: "120px" }}
                />

                <Column
                  field="status"
                  header="Status"
                  body={statusTemplate}
                  sortable
                  filter
                  style={{ minWidth: "140px" }}
                />

                <Column
                  field="last_seen_at"
                  header="Last Reports"
                  body={lastSeenTemplate}
                  sortable
                  style={{ minWidth: "220px" }}
                />

                <Column
                  header="Actions"
                  body={actionTemplate}
                  style={{ width: "90px", textAlign: "center" }}
                />
              </DataTable>
            </div>

            <div className="agent-mobile-cards">
              {filteredAgents.length > 0 ? (
                filteredAgents.map((agent) => {
                  const storageReport = getAgentStorageReport(agent);
                  const largestDirectory = getLargestDirectory(agent);
                  const totalStorageBytes = getTotalReportedStorageBytes(agent);

                  return (
                    <div className="agent-mobile-card" key={getAgentId(agent)}>
                      <div className="agent-mobile-card-top">
                        {agentTemplate(agent)}
                        {statusTemplate(agent)}
                      </div>

                      <div className="agent-mobile-meta">
                        <div>
                          <small>Site</small>
                          <strong>{agent.site || "—"}</strong>
                        </div>

                        <div>
                          <small>Version</small>
                          <strong>{agent.version || "—"}</strong>
                        </div>

                        <div>
                          <small>Host</small>
                          <strong>
                            {agent.hostname || storageReport?.hostname || "—"}
                          </strong>
                        </div>

                        <div>
                          <small>CPU</small>
                          <strong>
                            {percent(getAgentMetric(agent, "cpu_usage"))}
                          </strong>
                        </div>

                        <div>
                          <small>Memory</small>
                          <strong>
                            {percent(getAgentMetric(agent, "memory_usage"))}
                          </strong>
                        </div>

                        <div>
                          <small>Disk</small>
                          <strong>
                            {percent(getAgentMetric(agent, "disk_usage"))}
                          </strong>
                        </div>

                        <div>
                          <small>Reported Storage</small>
                          <strong>{formatBytes(totalStorageBytes)}</strong>
                        </div>

                        <div>
                          <small>Largest Directory</small>
                          <strong>{largestDirectory?.path || "—"}</strong>
                        </div>

                        <div>
                          <small>Largest Size</small>
                          <strong>
                            {formatBytes(largestDirectory?.size_bytes)}
                          </strong>
                        </div>

                        <div>
                          <small>Last seen</small>
                          <strong>{formatDate(agent.last_seen_at)}</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="primary-btn full"
                        onClick={() => openAgentDetails(agent)}
                      >
                        View details
                        <i className="pi pi-arrow-right" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state">
                  <i className="pi pi-server" />
                  <h3>No agents found</h3>
                  <p>Create your first agent to start collecting heartbeats.</p>
                </div>
              )}
            </div>
          </>
        )}

        <div className="agent-table-footer">
          <span>
            <i className="pi pi-circle-fill" />
            Connected
          </span>

          <strong>{filteredAgents.length} agent(s)</strong>
        </div>
      </section>

      <CreateAgentModal
        visible={createVisible}
        loading={creating}
        generatedCommand={generatedCommand}
        onHide={() => setCreateVisible(false)}
        onSubmit={handleCreateAgent}
        onCopyCommand={copyCommand}
      />
    </div>
  );
}