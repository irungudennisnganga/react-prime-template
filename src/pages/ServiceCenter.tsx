import { useEffect, useMemo, useState } from "react";
import { Column } from "primereact/column";
import { DataTable, DataTableFilterMeta } from "primereact/datatable";
import { FilterMatchMode } from "primereact/api";
import { useNavigate } from "react-router-dom";

import PageLoader from "../components/ui/PageLoader";
import AddServiceModal from "../components/ui/AddServiceModal";
import ServiceActionsMenu from "../components/ui/ServiceActionsMenu";
import { useAppToast } from "../components/ui/AppToast";
import {
  Agent,
  AgentService,
  AgentServicePayload,
  agentApi,
  agentServiceApi,
  getAgentId,
  getAgentServiceId,
  getAgentServiceType,
} from "../services/api";

function normalizeServiceState(state?: string) {
  const value = String(state || "pending").toLowerCase();

  if (value === "up" || value === "healthy") return "up";
  if (value === "down" || value === "unhealthy") return "down";

  return "pending";
}

function stateClass(state?: string) {
  const normalized = normalizeServiceState(state);

  if (normalized === "up") return "service-state-badge up";
  if (normalized === "down") return "service-state-badge down";

  return "service-state-badge pending";
}

function formatDate(date?: string) {
  if (!date) return "—";

  return new Date(date).toLocaleString();
}

export default function ServiceCenter() {
  const navigate = useNavigate();
  const { showToast } = useAppToast();

  const [services, setServices] = useState<AgentService[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);

  const [globalFilter, setGlobalFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");

  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    type: { value: null, matchMode: FilterMatchMode.CONTAINS },
    host: { value: null, matchMode: FilterMatchMode.CONTAINS },
    system_service: { value: null, matchMode: FilterMatchMode.CONTAINS },
    state: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const stats = useMemo(() => {
    const total = services.length;

    const enabled = services.filter((service) => service.enabled).length;

    const healthy = services.filter(
      (service) => normalizeServiceState(service.state) === "up"
    ).length;

    const unhealthy = services.filter(
      (service) => normalizeServiceState(service.state) === "down"
    ).length;

    return {
      total,
      enabled,
      healthy,
      unhealthy,
    };
  }, [services]);

  const filteredServices = useMemo(() => {
    const query = globalFilter.trim().toLowerCase();

    return services.filter((service) => {
      const matchesQuery =
        !query ||
        [
          service.name,
          getAgentServiceType(service),
          service.host,
          service.port,
          service.system_service,
          service.state,
          service.agent_name,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesAgent = !agentFilter || service.agent_id === agentFilter;

      return matchesQuery && matchesAgent;
    });
  }, [services, globalFilter, agentFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [serviceData, agentData] = await Promise.all([
        agentServiceApi.view(),
        agentApi.view(),
      ]);

      console.log("[agent-services/view] normalized services", serviceData);

      setServices(serviceData);
      setAgents(agentData);
    } catch (error: any) {
      showToast(
        "error",
        "Failed to load services",
        error.response?.data?.message || "Could not fetch service records."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createService = async (payload: AgentServicePayload) => {
    try {
      setSaving(true);

      const created = await agentServiceApi.create(payload);

      setServices((prev) => [created, ...prev]);
      setModalVisible(false);

      showToast("success", "Service created", "Service has been saved.");
    } catch (error: any) {
      showToast(
        "error",
        "Failed to save service",
        error.response?.data?.message ||
          error.message ||
          "Could not create service."
      );
    } finally {
      setSaving(false);
    }
  };

  const openServiceDetails = (service: AgentService) => {
    const id = getAgentServiceId(service);

    console.log("[ServiceCenter] opening service details", {
      id,
      service,
    });

    if (!id) {
      showToast(
        "warn",
        "Missing service ID",
        "This service record does not have an ID from the backend."
      );
      return;
    }

    navigate(`/services/${id}`);
  };

  const restartService = async (service: AgentService) => {
    const id = getAgentServiceId(service);

    if (!id) {
      showToast("warn", "Missing service ID", "This service has no ID.");
      return;
    }

    try {
      await agentServiceApi.restart(id);

      showToast(
        "success",
        "Restart requested",
        `${service.name} restart requested.`
      );

      await loadData();
    } catch (error: any) {
      showToast(
        "error",
        "Restart failed",
        error.response?.data?.message ||
          error.message ||
          "Could not restart service."
      );
    }
  };

  const enableService = async (service: AgentService) => {
    const id = getAgentServiceId(service);

    if (!id) {
      showToast("warn", "Missing service ID", "This service has no ID.");
      return;
    }

    try {
      const updated = await agentServiceApi.enable(id);

      setServices((prev) =>
        prev.map((item) =>
          getAgentServiceId(item) === id
            ? { ...item, ...updated, enabled: true }
            : item
        )
      );

      showToast("success", "Service enabled", `${service.name} has been enabled.`);
    } catch (error: any) {
      showToast(
        "error",
        "Enable failed",
        error.response?.data?.message ||
          error.message ||
          "Could not enable service."
      );
    }
  };

  const disableService = async (service: AgentService) => {
    const id = getAgentServiceId(service);

    if (!id) {
      showToast("warn", "Missing service ID", "This service has no ID.");
      return;
    }

    try {
      const updated = await agentServiceApi.disable(id);

      setServices((prev) =>
        prev.map((item) =>
          getAgentServiceId(item) === id
            ? { ...item, ...updated, enabled: false }
            : item
        )
      );

      showToast("success", "Service disabled", `${service.name} has been disabled.`);
    } catch (error: any) {
      showToast(
        "error",
        "Disable failed",
        error.response?.data?.message ||
          error.message ||
          "Could not disable service."
      );
    }
  };

  const handleSearchChange = (value: string) => {
    setGlobalFilter(value);

    setFilters((prev) => ({
      ...prev,
      global: {
        value,
        matchMode: FilterMatchMode.CONTAINS,
      },
    }));
  };

  const serviceNameTemplate = (service: AgentService) => {
    return (
      <div className="service-name-cell">
        <div className="service-icon">
          <i className="pi pi-database" />
        </div>

        <div>
          <strong>{service.name}</strong>
          <span>
            {service.host}:{service.port}
          </span>
          <small>Interval: {service.check_interval_sec || 60}s</small>
        </div>
      </div>
    );
  };

  const typeTemplate = (service: AgentService) => {
    const type = getAgentServiceType(service);

    return <span className={`service-type-pill ${type}`}>{type || "—"}</span>;
  };

  const stateTemplate = (service: AgentService) => {
    const state = normalizeServiceState(service.state);

    return <span className={stateClass(state)}>{state}</span>;
  };

  const configTemplate = (service: AgentService) => {
    return service.enabled ? (
      <span className="service-config-badge enabled">
        <i className="pi pi-check-circle" />
        Enabled
      </span>
    ) : (
      <span className="service-config-badge disabled">
        <i className="pi pi-ban" />
        Disabled
      </span>
    );
  };

  const lastCheckedTemplate = (service: AgentService) => {
    return (
      <div className="service-date-cell">
        <strong>{formatDate(service.last_checked_at)}</strong>
        <span>last checked</span>
      </div>
    );
  };

  const actionTemplate = (service: AgentService) => {
    return (
      <ServiceActionsMenu
        service={service}
        onView={openServiceDetails}
        onRestart={restartService}
        onEnable={enableService}
        onDisable={disableService}
      />
    );
  };

  return (
    <div className="service-page">
      <div className="service-page-top">
        <div>
          <span className="service-module-pill">
            <i className="pi pi-cog" />
            Service Management
          </span>

          <h1>Service Center</h1>

          <p>
            Configure and monitor MongoDB, Redis, RabbitMQ and other
            agent-managed services.
          </p>
        </div>

        <button
          type="button"
          className="primary-btn service-add-top-btn"
          onClick={() => setModalVisible(true)}
        >
          <i className="pi pi-plus" />
          Add service
        </button>
      </div>

      <div className="service-stats-grid">
        <div className="service-stat-card total">
          <span>Total Services</span>
          <strong>{stats.total}</strong>
          <small>All configured service records</small>
        </div>

        <div className="service-stat-card enabled">
          <span>Enabled</span>
          <strong>{stats.enabled}</strong>
          <small>Configuration currently active</small>
        </div>

        <div className="service-stat-card healthy">
          <span>Healthy</span>
          <strong>{stats.healthy}</strong>
          <small>Running or reachable services</small>
        </div>

        <div className="service-stat-card unhealthy">
          <span>Unhealthy</span>
          <strong>{stats.unhealthy}</strong>
          <small>Needs operational attention</small>
        </div>
      </div>

      <section className="service-table-card">
        <div className="service-toolbar">
          <div className="service-search">
            <i className="pi pi-search" />
            <input
              value={globalFilter}
              placeholder="Search by name, type, host, service..."
              onChange={(event) => handleSearchChange(event.target.value)}
            />
          </div>

          <div className="service-toolbar-actions">
            <label>
              <span>Agent</span>
              <select
                value={agentFilter}
                onChange={(event) => setAgentFilter(event.target.value)}
              >
                <option value="">All agents</option>

                {agents.map((agent) => {
                  const id = getAgentId(agent);

                  return (
                    <option key={id} value={id}>
                      {agent.name}
                      {agent.site ? ` - ${agent.site}` : ""}
                    </option>
                  );
                })}
              </select>
            </label>

            <button type="button" className="secondary-btn" onClick={loadData}>
              <i className="pi pi-refresh" />
            </button>
          </div>
        </div>

        {loading ? (
          <PageLoader message="Loading services..." />
        ) : (
          <>
            <div className="service-desktop-table">
              <DataTable
                value={filteredServices}
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 20, 50]}
                filters={filters}
                globalFilterFields={[
                  "name",
                  "type",
                  "service_type",
                  "host",
                  "system_service",
                  "state",
                ]}
                sortMode="multiple"
                removableSort
                scrollable
                scrollHeight="480px"
                stripedRows
                dataKey="id"
                emptyMessage="No services found."
                className="service-datatable"
              >
                <Column
                  field="name"
                  header="Service"
                  body={serviceNameTemplate}
                  sortable
                  filter
                  style={{ minWidth: "280px" }}
                />

                <Column
                  field="type"
                  header="Type"
                  body={typeTemplate}
                  sortable
                  filter
                  style={{ minWidth: "140px" }}
                />

                <Column
                  field="host"
                  header="Host"
                  sortable
                  filter
                  style={{ minWidth: "150px" }}
                />

                <Column
                  field="system_service"
                  header="System Service"
                  sortable
                  filter
                  style={{ minWidth: "160px" }}
                />

                <Column
                  field="state"
                  header="State"
                  body={stateTemplate}
                  sortable
                  filter
                  style={{ minWidth: "120px" }}
                />

                <Column
                  header="Config Status"
                  body={configTemplate}
                  style={{ minWidth: "160px" }}
                />

                <Column
                  field="last_checked_at"
                  header="Last Checked"
                  body={lastCheckedTemplate}
                  sortable
                  style={{ minWidth: "190px" }}
                />

                <Column
                  header="Actions"
                  body={actionTemplate}
                  style={{ width: "90px", textAlign: "center" }}
                />
              </DataTable>
            </div>

            <div className="service-mobile-cards">
              {filteredServices.map((service) => {
                const type = getAgentServiceType(service);

                return (
                  <div
                    className="service-mobile-card"
                    key={getAgentServiceId(service)}
                  >
                    <div className="service-mobile-top">
                      {serviceNameTemplate(service)}
                      {stateTemplate(service)}
                    </div>

                    <div className="service-mobile-meta">
                      <div>
                        <small>Type</small>
                        <strong>{type || "—"}</strong>
                      </div>

                      <div>
                        <small>System Service</small>
                        <strong>{service.system_service}</strong>
                      </div>

                      <div>
                        <small>Config</small>
                        <strong>{service.enabled ? "Enabled" : "Disabled"}</strong>
                      </div>

                      <div>
                        <small>Checked</small>
                        <strong>{formatDate(service.last_checked_at)}</strong>
                      </div>
                    </div>

                    <button
                      className="primary-btn full"
                      type="button"
                      onClick={() => openServiceDetails(service)}
                    >
                      View details
                      <i className="pi pi-arrow-right" />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <AddServiceModal
        visible={modalVisible}
        loading={saving}
        agents={agents}
        onHide={() => setModalVisible(false)}
        onSubmit={createService}
      />
    </div>
  );
}