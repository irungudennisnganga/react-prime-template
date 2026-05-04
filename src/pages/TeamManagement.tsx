import { useEffect, useMemo, useRef, useState } from "react";
import { Column } from "primereact/column";
import { DataTable, DataTableFilterMeta } from "primereact/datatable";
import { FilterMatchMode } from "primereact/api";
import { Menu } from "primereact/menu";

import PageLoader from "../components/ui/PageLoader";
import AddTeamMemberModal from "../components/ui/AddTeamMemberModal";
import { useAppToast } from "../components/ui/AppToast";
import {
  TeamMember,
  TeamMemberPayload,
  teamApi,
} from "../services/api";

function formatDate(date?: string | null) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleString();
}

function normalizeStatus(status?: string) {
  const value = String(status || "pending").toLowerCase();

  if (value === "active" || value === "joined") return "active";
  if (value === "pending" || value === "invited") return "pending";
  if (value === "disabled" || value === "blocked") return "disabled";

  return value || "pending";
}

function stateClass(status?: string) {
  const normalized = normalizeStatus(status);

  if (normalized === "active") return "service-state-badge up";
  if (normalized === "disabled") return "service-state-badge down";

  return "service-state-badge pending";
}

function getInitials(member: TeamMember) {
  const source = member.full_name || member.email || "TM";
  const parts = source.split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

type TeamActionsProps = {
  member: TeamMember;
  onDelete: (member: TeamMember) => void;
};

function TeamActions({ member, onDelete }: TeamActionsProps) {
  const menuRef = useRef<Menu>(null);

  const items = [
    {
      label: "Delete Member",
      icon: "pi pi-trash",
      command: () => onDelete(member),
      className: "team-delete-menu-item",
    },
  ];

  return (
    <div className="monitor-action-menu">
      <Menu model={items} popup ref={menuRef} className="monitor-popup-menu" />

      <button
        type="button"
        className="monitor-action-trigger p-button p-component p-button-rounded p-button-text"
        onClick={(event) => menuRef.current?.toggle(event)}
        aria-label="Open member actions"
      >
        <i className="pi pi-ellipsis-v" />
      </button>
    </div>
  );
}

export default function TeamManagement() {
  const { showToast } = useAppToast();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [filters, setFilters] = useState<DataTableFilterMeta>({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    full_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
    email: { value: null, matchMode: FilterMatchMode.CONTAINS },
    role: { value: null, matchMode: FilterMatchMode.CONTAINS },
    status: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });

  const stats = useMemo(() => {
    const total = members.length;

    const active = members.filter(
      (member) => normalizeStatus(member.status) === "active"
    ).length;

    const pending = members.filter(
      (member) => normalizeStatus(member.status) === "pending"
    ).length;

    const admins = members.filter((member) => {
      const role = String(member.role || "").toLowerCase();
      return role === "admin" || role === "owner";
    }).length;

    return {
      total,
      active,
      pending,
      admins,
    };
  }, [members]);

  const filteredMembers = useMemo(() => {
    const query = globalFilter.trim().toLowerCase();

    return members.filter((member) => {
      const normalizedStatus = normalizeStatus(member.status);

      const matchesQuery =
        !query ||
        [
          member.full_name,
          member.email,
          member.role,
          member.status,
          normalizedStatus,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        !statusFilter || normalizedStatus === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [members, globalFilter, statusFilter]);

  const loadMembers = async () => {
    try {
      setLoading(true);

      const data = await teamApi.view();
      setMembers(data);
    } catch (error: any) {
      showToast(
        "error",
        "Failed to load team",
        error.response?.data?.message || "Could not fetch team members."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
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

  const addMember = async (payload: TeamMemberPayload) => {
    try {
      setSaving(true);

      const created = await teamApi.add(payload);

      setMembers((prev) => [created, ...prev]);
      setModalVisible(false);

      showToast(
        "success",
        "Team member added",
        `${payload.full_name} has been added successfully.`
      );
    } catch (error: any) {
      showToast(
        "error",
        "Failed to add member",
        error.response?.data?.message || "Could not add team member."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteMember = async (member: TeamMember) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${member.full_name || member.email}?`
    );

    if (!confirmed) return;

    try {
      await teamApi.delete(member.id);

      setMembers((prev) => prev.filter((item) => item.id !== member.id));

      showToast(
        "success",
        "Member deleted",
        `${member.full_name || member.email} has been removed.`
      );
    } catch (error: any) {
      showToast(
        "error",
        "Failed to delete member",
        error.response?.data?.message || "Could not delete team member."
      );
    }
  };

  const memberTemplate = (member: TeamMember) => {
    return (
      <div className="service-name-cell">
        <div className="service-icon team-member-icon">
          {getInitials(member)}
        </div>

        <div>
          <strong>{member.full_name || "—"}</strong>
          <span>{member.email || "No email available"}</span>
          <small>{member.user_id || "No user ID"}</small>
        </div>
      </div>
    );
  };

  const roleTemplate = (member: TeamMember) => {
    return (
      <span className={`service-type-pill team-role-pill ${member.role || "member"}`}>
        {member.role || "member"}
      </span>
    );
  };

  const statusTemplate = (member: TeamMember) => {
    return (
      <span className={stateClass(member.status)}>
        {normalizeStatus(member.status)}
      </span>
    );
  };

  const permissionsTemplate = (member: TeamMember) => {
    const permissions = [
      { label: "Monitors", active: member.can_manage_monitors },
      { label: "SSL", active: member.can_manage_ssl },
      { label: "Team", active: member.can_manage_team },
      { label: "Billing", active: member.can_view_billing },
    ];

    return (
      <div className="team-permission-pill-row">
        {permissions.map((permission) => (
          <span
            key={permission.label}
            className={
              permission.active
                ? "team-permission-pill active"
                : "team-permission-pill"
            }
          >
            {permission.label}
          </span>
        ))}
      </div>
    );
  };

  const joinedTemplate = (member: TeamMember) => {
    return (
      <div className="service-date-cell">
        <strong>{formatDate(member.joined_at || member.created_at)}</strong>
        <span>{member.joined_at ? "joined" : "created"}</span>
      </div>
    );
  };

  const actionTemplate = (member: TeamMember) => {
    return <TeamActions member={member} onDelete={deleteMember} />;
  };

  return (
    <div className="service-page">
      <div className="service-page-top">
        <div>
          <span className="service-module-pill">
            <i className="pi pi-users" />
            Team Management
          </span>

          <h1>Team Management</h1>

          <p>
            Manage users, roles, permissions, and workspace access for your
            OpsRadar team.
          </p>
        </div>

        <button
          type="button"
          className="primary-btn service-add-top-btn"
          onClick={() => setModalVisible(true)}
        >
          <i className="pi pi-plus" />
          Add Member
        </button>
      </div>

      <div className="service-stats-grid">
        <div className="service-stat-card total">
          <span>Total Members</span>
          <strong>{stats.total}</strong>
          <small>All workspace team members</small>
        </div>

        <div className="service-stat-card enabled">
          <span>Active</span>
          <strong>{stats.active}</strong>
          <small>Members with active access</small>
        </div>

        <div className="service-stat-card healthy">
          <span>Admins / Owners</span>
          <strong>{stats.admins}</strong>
          <small>Members with elevated access</small>
        </div>

        <div className="service-stat-card unhealthy">
          <span>Pending</span>
          <strong>{stats.pending}</strong>
          <small>Invitations awaiting action</small>
        </div>
      </div>

      <section className="service-table-card">
        <div className="service-toolbar">
          <div className="service-search">
            <i className="pi pi-search" />
            <input
              value={globalFilter}
              placeholder="Search by name, email, role, or status..."
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
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="disabled">Disabled</option>
              </select>
            </label>

            <button type="button" className="secondary-btn" onClick={loadMembers}>
              <i className="pi pi-refresh" />
            </button>
          </div>
        </div>

        {loading ? (
          <PageLoader message="Loading team members..." />
        ) : (
          <>
            <div className="service-desktop-table">
              <DataTable
                value={filteredMembers}
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 20, 50]}
                filters={filters}
                globalFilterFields={["full_name", "email", "role", "status"]}
                sortMode="multiple"
                removableSort
                scrollable
                scrollHeight="480px"
                stripedRows
                dataKey="id"
                emptyMessage="No team members found."
                className="service-datatable"
              >
                <Column
                  field="full_name"
                  header="Member"
                  body={memberTemplate}
                  sortable
                  filter
                  style={{ minWidth: "300px" }}
                />

                <Column
                  field="role"
                  header="Role"
                  body={roleTemplate}
                  sortable
                  filter
                  style={{ minWidth: "140px" }}
                />

                <Column
                  field="status"
                  header="Status"
                  body={statusTemplate}
                  sortable
                  filter
                  style={{ minWidth: "130px" }}
                />

                <Column
                  header="Permissions"
                  body={permissionsTemplate}
                  style={{ minWidth: "310px" }}
                />

                <Column
                  field="joined_at"
                  header="Joined"
                  body={joinedTemplate}
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

            <div className="service-mobile-cards">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <div className="service-mobile-card" key={member.id}>
                    <div className="service-mobile-top">
                      {memberTemplate(member)}
                      {statusTemplate(member)}
                    </div>

                    <div className="service-mobile-meta">
                      <div>
                        <small>Role</small>
                        <strong>{member.role || "—"}</strong>
                      </div>

                      <div>
                        <small>Status</small>
                        <strong>{normalizeStatus(member.status)}</strong>
                      </div>

                      <div>
                        <small>Manage Team</small>
                        <strong>{member.can_manage_team ? "Yes" : "No"}</strong>
                      </div>

                      <div>
                        <small>Joined</small>
                        <strong>
                          {formatDate(member.joined_at || member.created_at)}
                        </strong>
                      </div>
                    </div>

                    <button
                      className="secondary-btn full team-delete-mobile-btn"
                      type="button"
                      onClick={() => deleteMember(member)}
                    >
                      Delete Member
                      <i className="pi pi-trash" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <i className="pi pi-search" />
                  <h3>No members found</h3>
                  <p>Try changing your search or status filter.</p>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      <AddTeamMemberModal
        visible={modalVisible}
        loading={saving}
        onHide={() => setModalVisible(false)}
        onSubmit={addMember}
      />
    </div>
  );
}