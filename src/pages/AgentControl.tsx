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

function buildFallbackInstallCommand(response: any) {
  const agentId = response?.id || response?.agent_id || "<agent-id>";
  const token = response?.token || "<agent-token>";

  return `curl -fsSL https://opsradar.tekvancesolutions.co.ke/install.sh | sudo bash -s -- --server http://localhost:8080 --agent-id ${agentId} --token ${token}`;
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
      const matchesSearch =
        !search ||
        [
          agent.name,
          agent.site,
          agent.hostname,
          agent.last_ip,
          agent.version,
          agent.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);

      const matchesStatus =
        !status || normalizeAgentStatus(agent.status) === status;

      return matchesSearch && matchesStatus;
    });
  }, [agents, globalFilter, statusFilter]);

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
        response.install_command || response.command || buildFallbackInstallCommand(response);

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
    return (
      <div className="agent-host-cell">
        <strong>{agent.hostname || "Unknown host"}</strong>
        <span>
          {agent.os || "unknown"} / {agent.arch || "unknown"} /{" "}
          {agent.last_ip || "no ip"}
        </span>
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
    return (
      <div className="agent-date-cell">
        <strong>{formatDate(agent.last_seen_at)}</strong>
        <span>last heartbeat</span>
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
          <p>Create, enroll, and monitor VPS agents.</p>
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

      <section className="agent-table-card">
        <div className="agent-toolbar">
          <div className="agent-search">
            <i className="pi pi-search" />
            <input
              value={globalFilter}
              placeholder="Search by name, site, host, status..."
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
                scrollHeight="460px"
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
                  header="Last Heartbeat"
                  body={lastSeenTemplate}
                  sortable
                  style={{ minWidth: "200px" }}
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
                filteredAgents.map((agent) => (
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
                        <strong>{agent.hostname || "—"}</strong>
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
                ))
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