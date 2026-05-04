import { useEffect, useMemo, useState } from "react";
import { Column } from "primereact/column";
import { DataTable, DataTableFilterMeta } from "primereact/datatable";
import { FilterMatchMode } from "primereact/api";

import MonitorFormModal from "../components/ui/MonitorFormModal";
import MonitorHistoryModal from "../components/ui/MonitorHistoryModal";
import MonitorActionsMenu from "../components/ui/MonitorActionsMenu";
import PageLoader from "../components/ui/PageLoader";
import { useAppToast } from "../components/ui/AppToast";
import {
  Monitor,
  MonitorHistoryItem,
  MonitorPayload,
  getMonitorId,
  monitorApi,
} from "../services/api";

type HistoryRange = "hour" | "day" | "week" | "month";

const HISTORY_RANGE_OPTIONS: Array<{
  label: string;
  value: HistoryRange;
  apiRange: string;
  limit: number;
}> = [
  {
    label: "Last Hour",
    value: "hour",
    apiRange: "1h",
    limit: 1000,
  },
  {
    label: "Today",
    value: "day",
    apiRange: "1d",
    limit: 3000,
  },
  {
    label: "This Week",
    value: "week",
    apiRange: "7d",
    limit: 10000,
  },
  {
    label: "This Month",
    value: "month",
    apiRange: "1m",
    limit: 30000,
  },
];

function normalizeStatus(status?: string) {
  const value = String(status || "pending").toLowerCase();

  if (value === "up" || value === "active" || value === "online") return "online";
  if (value === "down" || value === "offline") return "offline";
  if (value === "disabled") return "disabled";

  return "pending";
}

function getStatusClass(status?: string) {
  const normalized = normalizeStatus(status);

  if (normalized === "online") return "status-badge online";
  if (normalized === "offline") return "status-badge offline";
  if (normalized === "disabled") return "status-badge disabled";

  return "status-badge pending";
}

function getHistorySortDate(item: MonitorHistoryItem) {
  const value =
    (item as any).created_at ||
    (item as any).checked_at ||
    (item as any).timestamp ||
    (item as any).time ||
    0;

  return new Date(value).getTime();
}

export default function Targets() {
  const { showToast } = useAppToast();

  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">(
    "create"
  );

  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<MonitorHistoryItem[]>([]);
  const [historyRange, setHistoryRange] = useState<HistoryRange>("month");

  const [globalFilter, setGlobalFilter] = useState("");

  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    type: { value: null, matchMode: FilterMatchMode.CONTAINS },
    target: { value: null, matchMode: FilterMatchMode.CONTAINS },
    status: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const stats = useMemo(() => {
    const total = monitors.length;

    const online = monitors.filter(
      (monitor) => normalizeStatus(monitor.status) === "online"
    ).length;

    const offline = monitors.filter(
      (monitor) => normalizeStatus(monitor.status) === "offline"
    ).length;

    const pending = monitors.filter(
      (monitor) => normalizeStatus(monitor.status) === "pending"
    ).length;

    const disabled = monitors.filter(
      (monitor) => normalizeStatus(monitor.status) === "disabled"
    ).length;

    const uptime = total > 0 ? Math.round((online / total) * 100) : 0;

    return {
      total,
      online,
      offline,
      pending,
      disabled,
      uptime,
    };
  }, [monitors]);

  const loadMonitors = async () => {
    try {
      setLoading(true);

      const data = await monitorApi.list();
      setMonitors(data);
    } catch (error: any) {
      showToast(
        "error",
        "Failed to load targets",
        error.response?.data?.message || "Could not fetch monitor targets."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonitors();
  }, []);

  const openCreateModal = () => {
    setSelectedMonitor(null);
    setModalMode("create");
    setModalVisible(true);
  };

  const openViewModal = (monitor: Monitor) => {
    setSelectedMonitor(monitor);
    setModalMode("view");
    setModalVisible(true);
  };

  const openEditModal = (monitor: Monitor) => {
    setSelectedMonitor(monitor);
    setModalMode("edit");
    setModalVisible(true);
  };

  const handleSubmitMonitor = async (payload: MonitorPayload) => {
    try {
      setSaving(true);

      if (modalMode === "create") {
        const created = await monitorApi.create(payload);

        setMonitors((prev) => [created, ...prev]);

        showToast(
          "success",
          "Target created",
          "The monitoring target has been created successfully."
        );
      }

      if (modalMode === "edit" && selectedMonitor) {
        const updated = await monitorApi.update(selectedMonitor, payload);
        const updatedId = getMonitorId(updated) || getMonitorId(selectedMonitor);

        setMonitors((prev) =>
          prev.map((item) =>
            getMonitorId(item) === updatedId ? { ...item, ...updated } : item
          )
        );

        showToast(
          "success",
          "Target updated",
          "The monitoring target has been updated successfully."
        );
      }

      setModalVisible(false);
    } catch (error: any) {
      showToast(
        "error",
        "Request failed",
        error.response?.data?.message || "Could not save monitoring target."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDisableMonitor = async (monitor: Monitor) => {
    const monitorId = getMonitorId(monitor);
    const previousStatus = monitor.status || "online";
    const currentStatus = normalizeStatus(previousStatus);
    const nextStatus = currentStatus === "disabled" ? "online" : "disabled";

    setMonitors((prev) =>
      prev.map((item) =>
        getMonitorId(item) === monitorId
          ? {
              ...item,
              status: nextStatus,
            }
          : item
      )
    );

    try {
      const updated = await monitorApi.disable(monitor);

      setMonitors((prev) =>
        prev.map((item) =>
          getMonitorId(item) === monitorId
            ? {
                ...item,
                ...updated,
                status: updated.status || nextStatus,
              }
            : item
        )
      );

      showToast(
        "success",
        nextStatus === "disabled" ? "Target disabled" : "Target enabled",
        `${monitor.name} status has been updated.`
      );
    } catch (error: any) {
      setMonitors((prev) =>
        prev.map((item) =>
          getMonitorId(item) === monitorId
            ? {
                ...item,
                status: previousStatus,
              }
            : item
        )
      );

      showToast(
        "error",
        "Status update failed",
        error.response?.data?.message || "Could not update target status."
      );
    }
  };

  const loadMonitorHistory = async (
    monitor: Monitor,
    range: HistoryRange = historyRange
  ) => {
    const selectedRange =
      HISTORY_RANGE_OPTIONS.find((item) => item.value === range) ||
      HISTORY_RANGE_OPTIONS[3];

    try {
      setSelectedMonitor(monitor);
      setHistoryLoading(true);
      setHistory([]);

      const data = await monitorApi.history(
        monitor,
        selectedRange.apiRange,
        selectedRange.limit
      );

      const sortedData = [...data].sort((a, b) => {
        return getHistorySortDate(b) - getHistorySortDate(a);
      });

      setHistory(sortedData);
    } catch (error: any) {
      showToast(
        "error",
        "History failed",
        error.response?.data?.message || "Could not fetch target history."
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleViewHistory = async (monitor: Monitor) => {
    setSelectedMonitor(monitor);
    setHistoryVisible(true);
    setHistoryRange("month");

    await loadMonitorHistory(monitor, "month");
  };

  const handleHistoryRangeChange = async (value: HistoryRange) => {
    setHistoryRange(value);

    if (!selectedMonitor) return;

    await loadMonitorHistory(selectedMonitor, value);
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

  const filteredMobileMonitors = useMemo(() => {
    const query = globalFilter.trim().toLowerCase();

    if (!query) return monitors;

    return monitors.filter((monitor) => {
      return [
        monitor.name,
        monitor.type,
        monitor.target,
        String(monitor.interval),
        normalizeStatus(monitor.status),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [globalFilter, monitors]);

  const statusTemplate = (monitor: Monitor) => {
    const status = normalizeStatus(monitor.status);

    return <span className={getStatusClass(status)}>{status}</span>;
  };

  const typeTemplate = (monitor: Monitor) => {
    return <span className="monitor-type-pill">{monitor.type}</span>;
  };

  const intervalTemplate = (monitor: Monitor) => {
    return <span className="interval-pill">{monitor.interval}s</span>;
  };

  const targetTemplate = (monitor: Monitor) => {
    return (
      <div className="target-cell">
        <i className="pi pi-globe" />
        <span>{monitor.target}</span>
      </div>
    );
  };

  const nameTemplate = (monitor: Monitor) => {
    return (
      <div className="target-name-cell">
        <div className="target-name-icon">
          <i className="pi pi-desktop" />
        </div>

        <div>
          <strong>{monitor.name}</strong>
          <span>{monitor.type}</span>
        </div>
      </div>
    );
  };

  const actionsTemplate = (monitor: Monitor) => {
    return (
      <MonitorActionsMenu
        monitor={monitor}
        onView={openViewModal}
        onEdit={openEditModal}
        onHistory={handleViewHistory}
        onToggleStatus={handleDisableMonitor}
      />
    );
  };

  return (
    <div className="targets-page">
      <div className="page-header monitor-page-header" />

      <div className="monitor-summary-grid">
        <div className="monitor-summary-card total">
          <div>
            <span>Total Targets</span>
            <strong>{stats.total}</strong>
          </div>
          <i className="pi pi-desktop" />
        </div>

        <div className="monitor-summary-card online">
          <div>
            <span>Online</span>
            <strong>{stats.online}</strong>
          </div>
          <i className="pi pi-check-circle" />
        </div>

        <div className="monitor-summary-card offline">
          <div>
            <span>Offline</span>
            <strong>{stats.offline}</strong>
          </div>
          <i className="pi pi-times-circle" />
        </div>

        <div className="monitor-summary-card pending">
          <div>
            <span>Pending</span>
            <strong>{stats.pending}</strong>
          </div>
          <i className="pi pi-clock" />
        </div>

        <div className="monitor-summary-card uptime">
          <div>
            <span>Current Uptime</span>
            <strong>{stats.uptime}%</strong>
          </div>
          <i className="pi pi-chart-line" />
        </div>
      </div>

      <div className="monitor-table-card">
        <div className="monitor-card-header">
          <div>
            <h2>Monitoring Targets</h2>
            <p>View, filter, sort, and manage all configured checks.</p>
          </div>

          <button type="button" className="primary-btn" onClick={openCreateModal}>
            <i className="pi pi-plus" />
            Add Target
          </button>
        </div>

        <div className="monitor-table-toolbar">
          <div className="monitor-search">
            <i className="pi pi-search" />
            <input
              value={globalFilter}
              placeholder="Search targets by name, type, address, or status..."
              onChange={(event) => handleGlobalFilterChange(event.target.value)}
            />
          </div>

          <button type="button" className="secondary-btn" onClick={loadMonitors}>
            <i className="pi pi-refresh" />
            Refresh
          </button>
        </div>

        {loading ? (
          <PageLoader message="Loading monitoring targets..." />
        ) : (
          <>
            <div className="desktop-monitor-table">
              <DataTable
                value={monitors}
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 20, 50]}
                filters={filters}
                globalFilterFields={["name", "type", "target", "status"]}
                sortMode="multiple"
                removableSort
                scrollable
                scrollHeight="430px"
                stripedRows
                dataKey="_id"
                emptyMessage="No monitoring targets found."
                className="monitor-datatable polished-monitor-table"
              >
                <Column
                  field="name"
                  header="Target"
                  sortable
                  filter
                  body={nameTemplate}
                  style={{ minWidth: "230px" }}
                />

                <Column
                  field="target"
                  header="Address"
                  sortable
                  filter
                  body={targetTemplate}
                  style={{ minWidth: "240px" }}
                />

                <Column
                  field="type"
                  header="Type"
                  sortable
                  filter
                  body={typeTemplate}
                  style={{ minWidth: "130px" }}
                />

                <Column
                  field="interval"
                  header="Interval"
                  sortable
                  body={intervalTemplate}
                  style={{ minWidth: "120px" }}
                />

                <Column
                  field="status"
                  header="Status"
                  sortable
                  filter
                  body={statusTemplate}
                  style={{ minWidth: "140px" }}
                />

                <Column
                  header=""
                  body={actionsTemplate}
                  frozen
                  alignFrozen="right"
                  style={{ width: "76px", textAlign: "center" }}
                />
              </DataTable>
            </div>

            <div className="mobile-monitor-cards">
              {filteredMobileMonitors.length > 0 ? (
                filteredMobileMonitors.map((monitor) => {
                  const isDisabled = normalizeStatus(monitor.status) === "disabled";

                  return (
                    <div className="monitor-mobile-card" key={getMonitorId(monitor)}>
                      <div className="monitor-mobile-card-header">
                        <div>
                          <h3>{monitor.name}</h3>
                          <span>{monitor.target}</span>
                        </div>

                        {statusTemplate(monitor)}
                      </div>

                      <div className="monitor-mobile-meta">
                        <div>
                          <small>Type</small>
                          <strong>{monitor.type}</strong>
                        </div>

                        <div>
                          <small>Interval</small>
                          <strong>{monitor.interval}s</strong>
                        </div>
                      </div>

                      <div className="monitor-mobile-actions">
                        <button type="button" onClick={() => openViewModal(monitor)}>
                          <i className="pi pi-eye" />
                          View
                        </button>

                        <button type="button" onClick={() => openEditModal(monitor)}>
                          <i className="pi pi-pencil" />
                          Edit
                        </button>

                        <button type="button" onClick={() => handleViewHistory(monitor)}>
                          <i className="pi pi-history" />
                          History
                        </button>

                        <button
                          type="button"
                          className={isDisabled ? "success-action" : "danger-action"}
                          onClick={() => handleDisableMonitor(monitor)}
                        >
                          <i className={isDisabled ? "pi pi-check-circle" : "pi pi-ban"} />
                          {isDisabled ? "Enable" : "Disable"}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state">
                  <i className="pi pi-search" />
                  <h3>No targets found</h3>
                  <p>Try changing your search filter.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <MonitorFormModal
        visible={modalVisible}
        mode={modalMode}
        monitor={selectedMonitor}
        loading={saving}
        onHide={() => setModalVisible(false)}
        onSubmit={handleSubmitMonitor}
      />

      {historyVisible && selectedMonitor && (
        <div className="history-range-floating-filter">
          <div>
            <span>History Range</span>
            <strong>{selectedMonitor.name}</strong>
          </div>

          <select
            value={historyRange}
            disabled={historyLoading}
            onChange={(event) =>
              handleHistoryRangeChange(event.target.value as HistoryRange)
            }
          >
            {HISTORY_RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <MonitorHistoryModal
        visible={historyVisible}
        monitor={selectedMonitor}
        history={history}
        loading={historyLoading}
        onHide={() => {
          setHistoryVisible(false);
          setHistory([]);
        }}
      />
    </div>
  );
}