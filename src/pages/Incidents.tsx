import { useEffect, useMemo, useState } from "react";
import { DataView } from "primereact/dataview";
import { Column } from "primereact/column";
import { DataTable, DataTableFilterMeta } from "primereact/datatable";
import { FilterMatchMode } from "primereact/api";

import PageLoader from "../components/ui/PageLoader";
import { useAppToast } from "../components/ui/AppToast";
import {
  IncidentLog,
  Monitor,
  getMonitorId,
  incidentApi,
  monitorApi,
} from "../services/api";

function normalizeMonitorStatus(status?: string) {
  const value = String(status || "pending").toLowerCase();

  if (value === "up" || value === "active" || value === "online") return "online";
  if (value === "down" || value === "offline") return "offline";
  if (value === "disabled") return "disabled";

  return "pending";
}

function normalizeIncidentStatus(status?: string) {
  const value = String(status || "pending").toLowerCase();

  if (value === "down" || value === "offline") return "down";
  if (value === "resolved" || value === "online" || value === "up") return "resolved";
  if (value === "degraded") return "degraded";

  return "pending";
}

function getIncidentStatusClass(status?: string) {
  const normalized = normalizeIncidentStatus(status);

  if (normalized === "down") return "incident-status-badge down";
  if (normalized === "resolved") return "incident-status-badge resolved";
  if (normalized === "degraded") return "incident-status-badge degraded";

  return "incident-status-badge pending";
}

function getMonitorStatusClass(status?: string) {
  const normalized = normalizeMonitorStatus(status);

  if (normalized === "online") return "incident-monitor-pill online";
  if (normalized === "offline") return "incident-monitor-pill offline";
  if (normalized === "disabled") return "incident-monitor-pill disabled";

  return "incident-monitor-pill pending";
}

function formatDate(date?: string) {
  if (!date) return "—";

  return new Date(date).toLocaleString();
}

function formatResponseTime(row: IncidentLog) {
  const value = row.response_time || row.response_ms;

  if (!value) return "—";

  return `${value}ms`;
}

export default function Incidents() {
  const { showToast } = useAppToast();

  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [incidents, setIncidents] = useState<IncidentLog[]>([]);
  const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);

  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");

  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    status: { value: null, matchMode: FilterMatchMode.CONTAINS },
    message: { value: null, matchMode: FilterMatchMode.CONTAINS },
    monitor_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    target: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const loadIncidentData = async () => {
    try {
      setLoading(true);

      const [monitorData, incidentData] = await Promise.all([
        monitorApi.list(),
        incidentApi.view(),
      ]);

      setMonitors(monitorData);
      setIncidents(incidentData);

      if (!selectedMonitor && monitorData.length > 0) {
        setSelectedMonitor(monitorData[0]);
      }
    } catch (error: any) {
      showToast(
        "error",
        "Failed to load incidents",
        error.response?.data?.message || "Could not fetch incident data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidentData();
  }, []);

  const stats = useMemo(() => {
    const totalMonitors = monitors.length;

    const activeIncidents = incidents.filter((incident) => {
      const status = normalizeIncidentStatus(incident.status);
      return status === "down" || status === "degraded";
    }).length;

    const pendingChecks = incidents.filter(
      (incident) => normalizeIncidentStatus(incident.status) === "pending"
    ).length;

    return {
      totalMonitors,
      activeIncidents,
      pendingChecks,
      totalIncidents: incidents.length,
    };
  }, [monitors, incidents]);

  const selectedMonitorIncidents = useMemo(() => {
    if (!selectedMonitor) return incidents;

    const selectedId = getMonitorId(selectedMonitor);

    return incidents.filter((incident) => {
      return (
        incident.monitor_id === selectedId ||
        incident.target === selectedMonitor.target ||
        incident.monitor_name === selectedMonitor.name
      );
    });
  }, [incidents, selectedMonitor]);

  const visibleIncidents = useMemo(() => {
    const query = globalFilter.trim().toLowerCase();

    if (!query) return selectedMonitorIncidents;

    return selectedMonitorIncidents.filter((incident) =>
      [
        incident.monitor_name,
        incident.target,
        incident.type,
        incident.status,
        incident.message,
        String(incident.response_time || incident.response_ms || ""),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [selectedMonitorIncidents, globalFilter]);

  const selectedMonitorStatus = selectedMonitor
    ? normalizeMonitorStatus(selectedMonitor.status)
    : "pending";

  const selectedMonitorIncidentsCount = selectedMonitorIncidents.length;

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

  const monitorItemTemplate = (monitor: Monitor) => {
    const isSelected = getMonitorId(monitor) === getMonitorId(selectedMonitor || ({} as Monitor));
    const status = normalizeMonitorStatus(monitor.status);

    return (
      <button
        type="button"
        className={
          isSelected
            ? "incident-monitor-card selected"
            : "incident-monitor-card"
        }
        onClick={() => setSelectedMonitor(monitor)}
      >
        <div className="incident-monitor-card-top">
          <div className="incident-monitor-icon">
            <i className="pi pi-globe" />
          </div>

          <div>
            <strong>{monitor.name}</strong>
            <span>{monitor.target}</span>
          </div>
        </div>

        <div className="incident-monitor-card-bottom">
          <span className="incident-monitor-type">{monitor.type}</span>
          <span className={getMonitorStatusClass(status)}>{status}</span>
        </div>

        <small>Interval: {monitor.interval}s</small>
      </button>
    );
  };

  const statusBody = (row: IncidentLog) => {
    const status = normalizeIncidentStatus(row.status);

    return <span className={getIncidentStatusClass(status)}>{status}</span>;
  };

  const messageBody = (row: IncidentLog) => {
    return row.message || row.error || "No message";
  };

  const responseBody = (row: IncidentLog) => {
    return formatResponseTime(row);
  };

  const checkedAtBody = (row: IncidentLog) => {
    return formatDate(row.checked_at || row.created_at);
  };

  return (
    <div className="incidents-page">
      <div className="incidents-page-top">
        <div>
          <span className="incident-module-pill">
            <i className="pi pi-exclamation-triangle" />
            Incident Center
          </span>

          {/* <h1>Incidents</h1> */}

          <p>
            Review failures, degraded checks, and incident-style monitor activity
            across your monitoring targets.
          </p>
        </div>

        <button
          type="button"
          className="incident-refresh-btn"
          onClick={loadIncidentData}
        >
          <i className="pi pi-refresh" />
          Refresh
        </button>
      </div>

      <div className="incident-stats-grid">
        <div className="incident-stat-card total">
          <span>Total Monitors</span>
          <strong>{stats.totalMonitors}</strong>
          <small>All available monitor targets</small>
          <i className="pi pi-wave-pulse" />
        </div>

        <div className="incident-stat-card active">
          <span>Active Incidents</span>
          <strong>{stats.activeIncidents}</strong>
          <small>Down, offline, or unhealthy checks</small>
          <i className="pi pi-exclamation-triangle" />
        </div>

        <div className="incident-stat-card pending">
          <span>Pending Checks</span>
          <strong>{stats.pendingChecks}</strong>
          <small>Checks waiting or incomplete</small>
          <i className="pi pi-clock" />
        </div>
      </div>

      <section className="incident-main-card">
        {loading ? (
          <PageLoader message="Loading incident data..." />
        ) : (
          <div className="incident-workspace">
            <aside className="incident-monitor-list-panel">
              <div className="incident-panel-header">
                <div>
                  <h2>Monitors</h2>
                  <p>{monitors.length} total</p>
                </div>
              </div>

              <div className="incident-selected-mini">
                <span>
                  {selectedMonitor ? selectedMonitor.name : "No monitor selected"}
                </span>
                <strong>
                  {selectedMonitor ? selectedMonitor.target : "Select a monitor"}
                </strong>
              </div>

              <DataView
                value={monitors}
                itemTemplate={monitorItemTemplate}
                emptyMessage="No monitors found."
                className="incident-monitor-dataview"
              />
            </aside>

            <main className="incident-logs-panel">
              <div className="incident-logs-header">
                <div>
                  <h2>Incident Logs</h2>
                  <p>
                    Showing incident logs for{" "}
                    <strong>{selectedMonitor?.name || "all monitors"}</strong>
                  </p>
                </div>

                <div className="incident-search">
                  <i className="pi pi-search" />
                  <input
                    value={globalFilter}
                    placeholder="Search by message or status..."
                    onChange={(event) =>
                      handleGlobalFilterChange(event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="incident-selected-grid">
                <div className="incident-selected-card selected">
                  <span>Selected Monitor</span>
                  <strong>{selectedMonitor?.name || "—"}</strong>
                  <small>{selectedMonitor?.target || "No target selected"}</small>
                </div>

                <div className="incident-selected-card type">
                  <span>Monitor Type</span>
                  <strong>{selectedMonitor?.type || "—"}</strong>
                  <small>
                    Interval: {selectedMonitor?.interval || 0}s
                  </small>
                </div>

                <div className="incident-selected-card status">
                  <span>Current Status</span>
                  <strong>{selectedMonitorStatus}</strong>
                  <small>
                    {selectedMonitorStatus === "online"
                      ? "Active monitor"
                      : selectedMonitorStatus === "offline"
                        ? "Monitor is currently failing"
                        : "Monitor status needs attention"}
                  </small>
                </div>
              </div>

              <div className="incident-desktop-table">
                <DataTable
                  value={visibleIncidents}
                  paginator
                  rows={6}
                  rowsPerPageOptions={[5, 6, 10, 20]}
                  filters={filters}
                  globalFilterFields={[
                    "status",
                    "message",
                    "monitor_name",
                    "target",
                  ]}
                  sortMode="multiple"
                  removableSort
                  scrollable
                  scrollHeight="360px"
                  stripedRows
                  dataKey="_id"
                  emptyMessage="No incident logs found."
                  className="incident-datatable"
                >
                  <Column
                    field="status"
                    header="Status"
                    body={statusBody}
                    sortable
                    filter
                    style={{ minWidth: "140px" }}
                  />

                  <Column
                    field="message"
                    header="Message"
                    body={messageBody}
                    sortable
                    filter
                    style={{ minWidth: "260px" }}
                  />

                  <Column
                    field="response_time"
                    header="Response Time"
                    body={responseBody}
                    sortable
                    style={{ minWidth: "150px" }}
                  />

                  <Column
                    field="checked_at"
                    header="Checked At"
                    body={checkedAtBody}
                    sortable
                    style={{ minWidth: "180px" }}
                  />
                </DataTable>
              </div>

              <div className="incident-mobile-cards">
                {visibleIncidents.length > 0 ? (
                  visibleIncidents.map((incident, index) => (
                    <div
                      className="incident-mobile-card"
                      key={incident.id || incident._id || index}
                    >
                      <div className="incident-mobile-card-top">
                        {statusBody(incident)}
                        <span>{checkedAtBody(incident)}</span>
                      </div>

                      <h3>{messageBody(incident)}</h3>

                      <div className="incident-mobile-meta">
                        <div>
                          <small>Response Time</small>
                          <strong>{responseBody(incident)}</strong>
                        </div>

                        <div>
                          <small>Target</small>
                          <strong>{incident.target || selectedMonitor?.target || "—"}</strong>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <i className="pi pi-check-circle" />
                    <h3>No incident logs</h3>
                    <p>No incident records were found for the selected monitor.</p>
                  </div>
                )}
              </div>

              <div className="incident-logs-footer">
                <span>
                  <i className="pi pi-shield" />
                  Incident service ready
                </span>

                <strong>{selectedMonitorIncidentsCount} incident log(s)</strong>
              </div>
            </main>
          </div>
        )}
      </section>
    </div>
  );
}