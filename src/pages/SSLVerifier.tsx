import { useEffect, useMemo, useState } from "react";
import { Column } from "primereact/column";
import { DataTable, DataTableFilterMeta } from "primereact/datatable";
import { FilterMatchMode } from "primereact/api";

import PageLoader from "../components/ui/PageLoader";
import SSLDetailsModal from "../components/ui/SSLDetailsModal";
import { useAppToast } from "../components/ui/AppToast";
import {
  SSLDetails,
  SSLHistoryItem,
  SSLRecord,
  getSSLMonitorId,
  sslApi,
} from "../services/api";

function normalizeSSLStatus(status?: string, daysLeft?: number) {
  const value = String(status || "").toLowerCase();

  if (value === "valid") return "valid";
  if (value === "expired" || value === "invalid") return "expired";
  if (value === "warning" || (typeof daysLeft === "number" && daysLeft <= 14)) {
    return "warning";
  }

  return "unknown";
}

function sslStatusClass(status?: string, daysLeft?: number) {
  return `ssl-status-badge ${normalizeSSLStatus(status, daysLeft)}`;
}

export default function SSLVerifier() {
  const { showToast } = useAppToast();

  const [records, setRecords] = useState<SSLRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");

  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<SSLDetails | null>(null);
  const [history, setHistory] = useState<SSLHistoryItem[]>([]);

  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    target: { value: null, matchMode: FilterMatchMode.CONTAINS },
    target_type: { value: null, matchMode: FilterMatchMode.CONTAINS },
    status: { value: null, matchMode: FilterMatchMode.CONTAINS },
    issuer: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const stats = useMemo(() => {
    const total = records.length;

    const valid = records.filter(
      (record) => normalizeSSLStatus(record.status, record.days_left) === "valid"
    ).length;

    const warning = records.filter(
      (record) => normalizeSSLStatus(record.status, record.days_left) === "warning"
    ).length;

    const expired = records.filter(
      (record) => normalizeSSLStatus(record.status, record.days_left) === "expired"
    ).length;

    const unknown = records.filter(
      (record) => normalizeSSLStatus(record.status, record.days_left) === "unknown"
    ).length;

    const healthyRate = total > 0 ? Math.round((valid / total) * 100) : 0;

    return {
      total,
      valid,
      warning,
      expired,
      unknown,
      healthyRate,
    };
  }, [records]);

  const loadSSLRecords = async () => {
    try {
      setLoading(true);
      const data = await sslApi.view();
      setRecords(data);
    } catch (error: any) {
      showToast(
        "error",
        "Failed to load SSL records",
        error.response?.data?.message || "Could not fetch SSL records."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSSLRecords();
  }, []);

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

  const handleViewDetails = async (record: SSLRecord) => {
    const monitorId = getSSLMonitorId(record);

    if (!monitorId) {
      showToast("warn", "Missing monitor ID", "This SSL record has no monitor ID.");
      return;
    }

    try {
      setDetailsVisible(true);
      setDetailsLoading(true);
      setSelectedDetails(null);
      setHistory([]);

      const [detailsData, historyData] = await Promise.all([
        sslApi.details(monitorId),
        sslApi.history(monitorId, "1m", 1000),
      ]);

      setSelectedDetails(detailsData);
      setHistory(historyData);
    } catch (error: any) {
      showToast(
        "error",
        "Failed to load SSL details",
        error.response?.data?.message || "Could not fetch certificate details."
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const filteredMobileRecords = useMemo(() => {
    const query = globalFilter.trim().toLowerCase();

    if (!query) return records;

    return records.filter((record) =>
      [
        record.target,
        record.target_type,
        record.status,
        record.issuer,
        record.subject,
        String(record.days_left),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [records, globalFilter]);

  const statusTemplate = (record: SSLRecord) => {
    const status = normalizeSSLStatus(record.status, record.days_left);

    return (
      <span className={sslStatusClass(record.status, record.days_left)}>
        {status}
      </span>
    );
  };

  const targetTemplate = (record: SSLRecord) => {
    return (
      <div className="ssl-target-cell">
        <div className="ssl-target-icon">
          <i className="pi pi-globe" />
        </div>

        <div>
          <strong>{record.target}</strong>
          <span>{record.subject || "Certificate subject unavailable"}</span>
        </div>
      </div>
    );
  };

  const daysTemplate = (record: SSLRecord) => {
    const days = typeof record.days_left === "number" ? record.days_left : 0;

    return (
      <span
        className={
          days <= 0
            ? "ssl-days-pill expired"
            : days <= 14
              ? "ssl-days-pill warning"
              : "ssl-days-pill valid"
        }
      >
        {days} days
      </span>
    );
  };

  const expiresTemplate = (record: SSLRecord) => {
    return record.expires_at ? new Date(record.expires_at).toLocaleDateString() : "—";
  };

  const checkedTemplate = (record: SSLRecord) => {
    return record.checked_at ? new Date(record.checked_at).toLocaleString() : "—";
  };

  const actionTemplate = (record: SSLRecord) => {
    return (
      <button
        type="button"
        className="ssl-view-btn"
        onClick={() => handleViewDetails(record)}
      >
        View
        <i className="pi pi-arrow-right" />
      </button>
    );
  };

  return (
    <div className="ssl-page">
      <div className="ssl-page-top">
        <div>
          <span className="ssl-module-pill">
            <i className="pi pi-shield" />
            SSL Certificate Center
          </span>

          <h1>SSL Monitoring</h1>

          <p>
            Track certificate validity, expiry timelines, DNS names, and issuer
            information across your monitored URLs and domains.
          </p>
        </div>

        <button type="button" className="ssl-refresh-btn" onClick={loadSSLRecords}>
          <i className="pi pi-refresh" />
          Refresh SSL
        </button>
      </div>

      <div className="ssl-stats-grid">
        <div className="ssl-stat-card total">
          <span>Total Targets</span>
          <strong>{stats.total}</strong>
          <small>SSL-monitored endpoints</small>
          <i className="pi pi-globe" />
        </div>

        <div className="ssl-stat-card valid">
          <span>Valid</span>
          <strong>{stats.valid}</strong>
          <small>Certificates currently healthy</small>
          <i className="pi pi-check-circle" />
        </div>

        <div className="ssl-stat-card warning">
          <span>Expiring Soon</span>
          <strong>{stats.warning}</strong>
          <small>Need renewal attention</small>
          <i className="pi pi-exclamation-triangle" />
        </div>

        <div className="ssl-stat-card expired">
          <span>Expired</span>
          <strong>{stats.expired}</strong>
          <small>Certificate already invalid</small>
          <i className="pi pi-times-circle" />
        </div>

        <div className="ssl-stat-card healthy">
          <span>Healthy Rate</span>
          <strong>{stats.healthyRate}%</strong>
          <small>Valid certificates ratio</small>
          <i className="pi pi-chart-line" />
        </div>
      </div>

      <div className="ssl-content-grid">
        <section className="ssl-table-card">
          <div className="ssl-table-card-header">
            <div>
              <h2>Certificate Inventory</h2>
              <p>View, search, and inspect SSL records.</p>
            </div>

            <span>{records.length} records</span>
          </div>

          <div className="ssl-toolbar">
            <div className="ssl-search">
              <i className="pi pi-search" />
              <input
                value={globalFilter}
                placeholder="Search by target, issuer, status, or subject..."
                onChange={(event) => handleGlobalFilterChange(event.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <PageLoader message="Loading SSL certificate records..." />
          ) : (
            <>
              <div className="ssl-desktop-table">
                <DataTable
                  value={records}
                  paginator
                  rows={10}
                  rowsPerPageOptions={[5, 10, 20, 50]}
                  filters={filters}
                  globalFilterFields={[
                    "target",
                    "target_type",
                    "status",
                    "issuer",
                    "subject",
                  ]}
                  sortMode="multiple"
                  removableSort
                  scrollable
                  scrollHeight="440px"
                  stripedRows
                  dataKey="monitor_id"
                  emptyMessage="No SSL certificate records found."
                  className="ssl-datatable"
                >
                  <Column
                    field="target"
                    header="Target"
                    body={targetTemplate}
                    sortable
                    filter
                    style={{ minWidth: "280px" }}
                  />
                  <Column
                    field="target_type"
                    header="Type"
                    sortable
                    filter
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
                    field="days_left"
                    header="Days Left"
                    body={daysTemplate}
                    sortable
                    style={{ minWidth: "120px" }}
                  />
                  <Column
                    field="expires_at"
                    header="Expires"
                    body={expiresTemplate}
                    sortable
                    style={{ minWidth: "150px" }}
                  />
                  <Column
                    field="checked_at"
                    header="Last Checked"
                    body={checkedTemplate}
                    sortable
                    style={{ minWidth: "170px" }}
                  />
                  <Column
                    header="Actions"
                    body={actionTemplate}
                    style={{ width: "110px" }}
                  />
                </DataTable>
              </div>

              <div className="ssl-mobile-cards">
                {filteredMobileRecords.length > 0 ? (
                  filteredMobileRecords.map((record) => (
                    <div
                      className="ssl-mobile-card"
                      key={getSSLMonitorId(record) || record.target}
                    >
                      <div className="ssl-mobile-card-header">
                        <div>
                          <h3>{record.target}</h3>
                          <span>{record.subject || "No subject"}</span>
                        </div>

                        {statusTemplate(record)}
                      </div>

                      <div className="ssl-mobile-meta">
                        <div>
                          <small>Days Left</small>
                          <strong>{record.days_left ?? 0}</strong>
                        </div>

                        <div>
                          <small>Expires</small>
                          <strong>{expiresTemplate(record)}</strong>
                        </div>

                        <div>
                          <small>Issuer</small>
                          <strong>{record.issuer || "—"}</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="ssl-view-btn full"
                        onClick={() => handleViewDetails(record)}
                      >
                        View Details
                        <i className="pi pi-arrow-right" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <i className="pi pi-shield" />
                    <h3>No SSL records found</h3>
                    <p>Try changing your search filter.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        <aside className="ssl-filter-card">
          <h3>Filters</h3>
          <p>Narrow down certificate records quickly.</p>

          <label>Search</label>
          <div className="ssl-mini-input">
            <i className="pi pi-search" />
            <input
              value={globalFilter}
              placeholder="Search issuer, target, status..."
              onChange={(event) => handleGlobalFilterChange(event.target.value)}
            />
          </div>

          <label>Status</label>
          <select
            onChange={(event) => handleGlobalFilterChange(event.target.value)}
            defaultValue=""
          >
            <option value="">All</option>
            <option value="valid">Valid</option>
            <option value="warning">Warning</option>
            <option value="expired">Expired</option>
            <option value="unknown">Unknown</option>
          </select>
        </aside>
      </div>

      <SSLDetailsModal
        visible={detailsVisible}
        details={selectedDetails}
        history={history}
        loading={detailsLoading}
        onHide={() => setDetailsVisible(false)}
      />
    </div>
  );
}