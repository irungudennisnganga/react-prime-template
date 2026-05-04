import { useEffect, useMemo, useRef, useState } from "react";
import { Column } from "primereact/column";
import { DataTable, DataTableFilterMeta } from "primereact/datatable";
import { FilterMatchMode } from "primereact/api";
import { Menu } from "primereact/menu";

import PageLoader from "../components/ui/PageLoader";
import { useAppToast } from "../components/ui/AppToast";
import { AlertEmail, alertEmailApi } from "../services/api";
import AlertEmailDetailsModal from "../components/ui/AlertEmailDetailsModal";

function formatDate(date?: string | null) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleString();
}

function normalizeEmailStatus(email: AlertEmail) {
  const status = String(email.status || "").toLowerCase();

  if (status === "sent") return "sent";
  if (status === "failed") return "failed";
  if (status === "queued") return "queued";
  if (email.sent_at) return "sent";

  return status || "unknown";
}

function getEmailStateClass(email: AlertEmail) {
  const status = normalizeEmailStatus(email);

  if (status === "sent") return "service-state-badge up";
  if (status === "failed") return "service-state-badge down";
  if (status === "queued") return "service-state-badge pending";

  return "service-state-badge pending";
}

type AlertEmailActionsProps = {
  email: AlertEmail;
  onView: (email: AlertEmail) => void;
};

function AlertEmailActions({ email, onView }: AlertEmailActionsProps) {
  const menuRef = useRef<Menu>(null);

  const items = [
    {
      label: "View Email",
      icon: "pi pi-eye",
      command: () => onView(email),
    },
  ];

  return (
    <div className="table-actions-wrap">
      <Menu model={items} popup ref={menuRef} className="table-action-menu" />

      <button
        type="button"
        className="table-kebab-btn"
        onClick={(event) => menuRef.current?.toggle(event)}
        aria-label="Open email actions"
      >
        <i className="pi pi-ellipsis-v" />
      </button>
    </div>
  );
}

export default function AlertEmails() {
  const { showToast } = useAppToast();

  const [emails, setEmails] = useState<AlertEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<AlertEmail | null>(null);

  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);

  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    to_email: { value: null, matchMode: FilterMatchMode.CONTAINS },
    subject: { value: null, matchMode: FilterMatchMode.CONTAINS },
    monitor_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    event_type: { value: null, matchMode: FilterMatchMode.CONTAINS },
    status: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const stats = useMemo(() => {
    const total = emails.length;

    const sent = emails.filter(
      (email) => normalizeEmailStatus(email) === "sent"
    ).length;

    const opened = emails.filter(
      (email) => Boolean(email.opened) || Number(email.open_count || 0) > 0
    ).length;

    const clicked = emails.filter(
      (email) => Number(email.click_count || 0) > 0
    ).length;

    const failed = emails.filter(
      (email) => normalizeEmailStatus(email) === "failed"
    ).length;

    return {
      total,
      sent,
      opened,
      clicked,
      failed,
    };
  }, [emails]);

  const filteredEmails = useMemo(() => {
    const query = globalFilter.trim().toLowerCase();

    return emails.filter((email) => {
      const normalizedStatus = normalizeEmailStatus(email);

      const matchesQuery =
        !query ||
        [
          email.to_email,
          email.subject,
          email.monitor_name,
          email.target,
          email.monitor_type,
          email.event_type,
          email.status,
          normalizedStatus,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        !statusFilter || normalizedStatus === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [emails, globalFilter, statusFilter]);

  const loadEmails = async () => {
    try {
      setLoading(true);

      const data = await alertEmailApi.list({
        limit: 500,
      });

      setEmails(data);
    } catch (error: any) {
      showToast(
        "error",
        "Failed to load alert emails",
        error.response?.data?.message || "Could not fetch alert emails."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmails();
  }, []);

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

  const handleViewEmail = async (email: AlertEmail) => {
    try {
      setDetailsVisible(true);
      setDetailsLoading(true);
      setSelectedEmail(email);

      const details = await alertEmailApi.details(email.id);
      setSelectedEmail(details);
    } catch (error: any) {
      showToast(
        "error",
        "Failed to load email",
        error.response?.data?.message || "Could not fetch alert email details."
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const recipientTemplate = (email: AlertEmail) => {
    return (
      <div className="service-name-cell">
        <div className="service-icon alert-email-icon">
          <i className="pi pi-envelope" />
        </div>

        <div>
          <strong>{email.to_email || "—"}</strong>
          <span>{email.subject || "No subject"}</span>
          <small>{email.event_type || "Alert email"}</small>
        </div>
      </div>
    );
  };

  const monitorTemplate = (email: AlertEmail) => {
    return (
      <div className="alert-monitor-cell">
        <strong>{email.monitor_name || "—"}</strong>
        <span>{email.target || "No target available"}</span>
      </div>
    );
  };

  const typeTemplate = (email: AlertEmail) => {
    return (
      <span className="service-type-pill email">
        {email.monitor_type || email.event_type || "alert"}
      </span>
    );
  };

  const statusTemplate = (email: AlertEmail) => {
    return (
      <span className={getEmailStateClass(email)}>
        {normalizeEmailStatus(email)}
      </span>
    );
  };

  const trackingTemplate = (email: AlertEmail) => {
    const opened = Boolean(email.opened) || Number(email.open_count || 0) > 0;
    const clicked = Number(email.click_count || 0) > 0;

    return (
      <div className="alert-tracking-cell">
        <span className={opened ? "email-state-pill opened" : "email-state-pill"}>
          <i className={opened ? "pi pi-eye" : "pi pi-eye-slash"} />
          {email.open_count || 0}
        </span>

        <span className={clicked ? "email-state-pill clicked" : "email-state-pill"}>
          <i className="pi pi-link" />
          {email.click_count || 0}
        </span>
      </div>
    );
  };

  const lastActivityTemplate = (email: AlertEmail) => {
    const date =
      email.clicked_at || email.opened_at || email.sent_at || email.created_at;

    return (
      <div className="service-date-cell">
        <strong>{formatDate(date)}</strong>
        <span>
          {email.clicked_at
            ? "last clicked"
            : email.opened_at
              ? "last opened"
              : email.sent_at
                ? "sent"
                : "created"}
        </span>
      </div>
    );
  };

  const actionTemplate = (email: AlertEmail) => {
    return <AlertEmailActions email={email} onView={handleViewEmail} />;
  };

  return (
    <div className="service-page">
      <div className="service-page-top">
        <div>
          <span className="service-module-pill">
            <i className="pi pi-envelope" />
            Alert Email Tracking
          </span>

          <h1>Alert Emails</h1>

          <p>
            View sent alert emails, delivery status, open tracking, click
            tracking, and the actual email body.
          </p>
        </div>

        <button
          type="button"
          className="primary-btn service-add-top-btn"
          onClick={loadEmails}
        >
          <i className="pi pi-refresh" />
          Refresh
        </button>
      </div>

      <div className="alert-email-summary-grid">
        <div className="alert-email-summary-card total">
          <div>
            <span>All Emails</span>
            <strong>{stats.total}</strong>
          </div>

          <div className="alert-email-summary-icon total">
            <i className="pi pi-envelope" />
          </div>
        </div>

        <div className="alert-email-summary-card sent">
          <div>
            <span>Sent Emails</span>
            <strong>{stats.sent}</strong>
          </div>

          <div className="alert-email-summary-icon sent">
            <i className="pi pi-send" />
          </div>
        </div>

        <div className="alert-email-summary-card opened">
          <div>
            <span>Opened Emails</span>
            <strong>{stats.opened}</strong>
          </div>

          <div className="alert-email-summary-icon opened">
            <i className="pi pi-eye" />
          </div>
        </div>

        <div className="alert-email-summary-card clicked">
          <div>
            <span>Clicked Emails</span>
            <strong>{stats.clicked}</strong>
          </div>

          <div className="alert-email-summary-icon clicked">
            <i className="pi pi-link" />
          </div>
        </div>

        <div className="alert-email-summary-card failed">
          <div>
            <span>Failed Emails</span>
            <strong>{stats.failed}</strong>
          </div>

          <div className="alert-email-summary-icon failed">
            <i className="pi pi-times-circle" />
          </div>
        </div>
      </div>

      <section className="service-table-card">
        <div className="service-toolbar">
          <div className="service-search">
            <i className="pi pi-search" />
            <input
              value={globalFilter}
              placeholder="Search by recipient, subject, monitor, event, or status..."
              onChange={(event) => handleSearchChange(event.target.value)}
            />
          </div>

          <div className="service-toolbar-actions">
            <label>
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">All statuses</option>
                <option value="sent">Sent</option>
                <option value="queued">Queued</option>
                <option value="failed">Failed</option>
                <option value="unknown">Unknown</option>
              </select>
            </label>

            <button type="button" className="secondary-btn" onClick={loadEmails}>
              <i className="pi pi-refresh" />
            </button>
          </div>
        </div>

        {loading ? (
          <PageLoader message="Loading alert emails..." />
        ) : (
          <>
            <div className="service-desktop-table">
              <DataTable
                value={filteredEmails}
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 20, 50]}
                filters={filters}
                globalFilterFields={[
                  "to_email",
                  "subject",
                  "monitor_name",
                  "target",
                  "event_type",
                  "status",
                ]}
                sortMode="multiple"
                removableSort
                scrollable
                scrollHeight="480px"
                stripedRows
                dataKey="id"
                emptyMessage="No alert emails found."
                className="service-datatable alert-email-datatable"
              >
                <Column
                  field="to_email"
                  header="Email"
                  body={recipientTemplate}
                  sortable
                  filter
                  style={{ minWidth: "310px" }}
                />

                <Column
                  field="monitor_name"
                  header="Monitor"
                  body={monitorTemplate}
                  sortable
                  filter
                  style={{ minWidth: "240px" }}
                />

                <Column
                  field="monitor_type"
                  header="Type"
                  body={typeTemplate}
                  sortable
                  style={{ minWidth: "130px" }}
                />

                <Column
                  field="status"
                  header="State"
                  body={statusTemplate}
                  sortable
                  filter
                  style={{ minWidth: "120px" }}
                />

                <Column
                  header="Tracking"
                  body={trackingTemplate}
                  style={{ minWidth: "170px" }}
                />

                <Column
                  field="sent_at"
                  header="Last Activity"
                  body={lastActivityTemplate}
                  sortable
                  style={{ minWidth: "210px" }}
                />

                <Column
                  header="Actions"
                  body={actionTemplate}
                  style={{ width: "90px", textAlign: "center" }}
                />
              </DataTable>
            </div>

            <div className="service-mobile-cards">
              {filteredEmails.length > 0 ? (
                filteredEmails.map((email) => (
                  <div className="service-mobile-card" key={email.id}>
                    <div className="service-mobile-top">
                      {recipientTemplate(email)}
                      {statusTemplate(email)}
                    </div>

                    <div className="service-mobile-meta">
                      <div>
                        <small>Monitor</small>
                        <strong>{email.monitor_name || "—"}</strong>
                      </div>

                      <div>
                        <small>Event</small>
                        <strong>{email.event_type || "—"}</strong>
                      </div>

                      <div>
                        <small>Opened</small>
                        <strong>{email.open_count || 0}</strong>
                      </div>

                      <div>
                        <small>Clicked</small>
                        <strong>{email.click_count || 0}</strong>
                      </div>
                    </div>

                    <button
                      className="primary-btn full"
                      type="button"
                      onClick={() => handleViewEmail(email)}
                    >
                      View email
                      <i className="pi pi-arrow-right" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <i className="pi pi-search" />
                  <h3>No emails found</h3>
                  <p>Try changing your search or status filter.</p>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      <AlertEmailDetailsModal
        visible={detailsVisible}
        email={selectedEmail}
        loading={detailsLoading}
        onHide={() => setDetailsVisible(false)}
      />
    </div>
  );
}