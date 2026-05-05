import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Divider } from "primereact/divider";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { Toolbar } from "primereact/toolbar";
import { Message } from "primereact/message";
import './agent.css';
import {
  AgentRelease,
  agentReleasesApi,
  CreateAgentReleasePayload,
} from "../../services/api";

import AgentReleaseActionsMenu from "../../components/ui/AgentReleaseActionsMenu";

import "./agent.css";

type FormState = {
  version: string;
  title: string;
  platform: string;
  architecture: string;
  download_url: string;
  checksum: string;
  notes: string;
};

const emptyForm: FormState = {
  version: "",
  title: "",
  platform: "linux",
  architecture: "amd64",
  download_url: "",
  checksum: "",
  notes: "",
};

export default function AgentReleasesPage() {
  const toast = useRef<Toast>(null);

  const [releases, setReleases] = useState<AgentRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [globalFilter, setGlobalFilter] = useState("");

  const [createDialogVisible, setCreateDialogVisible] = useState(false);
  const [detailsDialogVisible, setDetailsDialogVisible] = useState(false);

  const [selectedRelease, setSelectedRelease] = useState<AgentRelease | null>(
    null
  );

  const [form, setForm] = useState<FormState>(emptyForm);

  const fetchReleases = async () => {
    try {
      setLoading(true);

      const response = await agentReleasesApi.view();
      setReleases(response.data || []);
    } catch (error: any) {
      toast.current?.show({
        severity: "error",
        summary: "Failed",
        detail:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to fetch agent releases",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, []);

  const stats = useMemo(() => {
    const total = releases.length;
    const active = releases.filter(
      (release) => release.is_active || release.status === "active"
    ).length;
    const linux = releases.filter((release) => release.platform === "linux")
      .length;
    const latest = releases[0]?.version || "—";

    return {
      total,
      active,
      linux,
      latest,
    };
  }, [releases]);

  const createRelease = async () => {
    if (!form.version.trim()) {
      toast.current?.show({
        severity: "warn",
        summary: "Version required",
        detail: "Release version is required",
      });
      return;
    }

    if (!form.download_url.trim()) {
      toast.current?.show({
        severity: "warn",
        summary: "Download URL required",
        detail: "Release download URL is required",
      });
      return;
    }

    try {
      setSaving(true);

      const payload: CreateAgentReleasePayload = {
        version: form.version.trim(),
        title: form.title.trim(),
        platform: form.platform.trim(),
        architecture: form.architecture.trim(),
        download_url: form.download_url.trim(),
        file_url: form.download_url.trim(),
        checksum: form.checksum.trim(),
        notes: form.notes.trim(),
        description: form.notes.trim(),
      };

      const response = await agentReleasesApi.create(payload);

      toast.current?.show({
        severity: "success",
        summary: "Created",
        detail: response.message || "Agent release created successfully",
      });

      setForm(emptyForm);
      setCreateDialogVisible(false);
      await fetchReleases();
    } catch (error: any) {
      toast.current?.show({
        severity: "error",
        summary: "Failed",
        detail:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to create release",
      });
    } finally {
      setSaving(false);
    }
  };

  const activateRelease = async (release: AgentRelease) => {
    try {
      setSaving(true);

      const response = await agentReleasesApi.activate(release.id);

      toast.current?.show({
        severity: "success",
        summary: "Activated",
        detail:
          response.message || `Release ${release.version} is now the active release`,
      });

      await fetchReleases();
    } catch (error: any) {
      toast.current?.show({
        severity: "error",
        summary: "Failed",
        detail:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to activate release",
      });
    } finally {
      setSaving(false);
    }
  };

  const copyText = async (text?: string) => {
    if (!text) {
      toast.current?.show({
        severity: "warn",
        summary: "Nothing to copy",
        detail: "No URL available for this release",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(text);

      toast.current?.show({
        severity: "success",
        summary: "Copied",
        detail: "Copied to clipboard",
      });
    } catch {
      toast.current?.show({
        severity: "error",
        summary: "Copy failed",
        detail: "Could not copy to clipboard",
      });
    }
  };

  const openDetails = (release: AgentRelease) => {
    setSelectedRelease(release);
    setDetailsDialogVisible(true);
  };

  const statusSeverity = (release: AgentRelease) => {
    if (release.is_active || release.status === "active") return "success";
    if (release.status === "draft") return "warning";
    return "secondary";
  };

  const formatDate = (value?: string) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString();
  };

  const versionTemplate = (release: AgentRelease) => {
    return (
      <div className="release-version-cell">
        <div className="release-icon">
          <i className="pi pi-cloud-upload" />
        </div>

        <div>
          <div className="release-version">{release.version}</div>
          <div className="release-title">
            {release.title || release.notes || "Agent release package"}
          </div>
        </div>
      </div>
    );
  };

  const platformTemplate = (release: AgentRelease) => {
    return (
      <div className="release-platforms">
        <span className="release-platform-badge">
          <i className="pi pi-desktop" />
          {release.platform || "linux"}
        </span>

        <span className="release-arch-badge">
          <i className="pi pi-microchip" />
          {release.architecture || "amd64"}
        </span>
      </div>
    );
  };

  const statusTemplate = (release: AgentRelease) => {
    const isActive = release.is_active || release.status === "active";

    return (
      <Tag
        value={isActive ? "active" : release.status || "inactive"}
        severity={statusSeverity(release)}
        rounded
        className="release-status-tag"
      />
    );
  };

  const urlTemplate = (release: AgentRelease) => {
    const url = release.download_url || release.file_url;

    return url ? (
      <Button
        label="Copy URL"
        icon="pi pi-copy"
        size="small"
        outlined
        className="release-copy-btn"
        onClick={() => copyText(url)}
      />
    ) : (
      <span className="release-muted">No URL</span>
    );
  };

  const actionsTemplate = (release: AgentRelease) => {
    return (
      <AgentReleaseActionsMenu
        release={release}
        onView={openDetails}
        onActivate={activateRelease}
        onCopyUrl={(item) => copyText(item.download_url || item.file_url)}
      />
    );
  };

  const toolbarStart = (
    <div className="releases-toolbar-title">
      <h2>Release List</h2>
      <p>Manage available versions for remote agent auto-updates.</p>
    </div>
  );

  const toolbarEnd = (
    <div className="releases-toolbar-actions">
      <span className="p-input-icon-left releases-search">
        <i className="pi pi-search" />
        <InputText
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder="Search releases..."
        />
      </span>

      <Button
        label="Refresh"
        icon="pi pi-refresh"
        outlined
        onClick={fetchReleases}
        loading={loading}
      />

      <Button
        label="New Release"
        icon="pi pi-plus"
        onClick={() => setCreateDialogVisible(true)}
      />
    </div>
  );

  return (
    <div className="agent-releases-page">
      <Toast ref={toast} />

      <div className="releases-header">
        <div>
          <span className="releases-kicker">Agent Updater</span>
          <h1>Agent Releases</h1>
          <p>
            Publish new OpsRadar agent versions and choose the active release
            that remote agents should upgrade to.
          </p>
        </div>

        <Button
          label="Create Release"
          icon="pi pi-plus"
          className="releases-main-cta"
          onClick={() => setCreateDialogVisible(true)}
        />
      </div>

      <div className="releases-stats-grid">
        <Card className="release-stat-card total">
          <span>Total Releases</span>
          <strong>{stats.total}</strong>
          <small>All published packages</small>
        </Card>

        <Card className="release-stat-card active">
          <span>Active Release</span>
          <strong>{stats.active}</strong>
          <small>Currently selected</small>
        </Card>

        <Card className="release-stat-card linux">
          <span>Linux Builds</span>
          <strong>{stats.linux}</strong>
          <small>Supported server builds</small>
        </Card>

        <Card className="release-stat-card latest">
          <span>Latest Version</span>
          <strong>{stats.latest}</strong>
          <small>Newest listed release</small>
        </Card>
      </div>

      <Card className="releases-table-card">
        <Toolbar
          start={toolbarStart}
          end={toolbarEnd}
          className="releases-toolbar"
        />

        <DataTable
          value={releases}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 20, 50]}
          dataKey="id"
          globalFilter={globalFilter}
          emptyMessage="No agent releases found"
          className="releases-table"
          responsiveLayout="scroll"
        >
          <Column
            header="Release"
            body={versionTemplate}
            field="version"
            sortable
          />

          <Column header="Target" body={platformTemplate} />

          <Column
            header="Status"
            body={statusTemplate}
            field="status"
            sortable
          />

          <Column
            header="Created"
            body={(release: AgentRelease) => formatDate(release.created_at)}
            field="created_at"
            sortable
          />

          <Column header="Download" body={urlTemplate} />

          <Column
            header=""
            body={actionsTemplate}
            style={{ width: "80px", textAlign: "right" }}
          />
        </DataTable>
      </Card>

      <Dialog
        header="Create Agent Release"
        visible={createDialogVisible}
        onHide={() => {
          setCreateDialogVisible(false);
          setForm(emptyForm);
        }}
        className="release-dialog"
        modal
      >
        <div className="release-form">
          <Message
            severity="info"
            text="Create a release using the version, download URL, and checksum generated from your agent build process."
            className="release-info-message"
          />

          <div className="release-form-grid">
            <div className="release-form-group">
              <label>Version</label>
              <InputText
                value={form.version}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    version: event.target.value,
                  }))
                }
                placeholder="Example: v1.0.3"
              />
            </div>

            <div className="release-form-group">
              <label>Title</label>
              <InputText
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
                placeholder="Example: Stable Linux Agent"
              />
            </div>

            <div className="release-form-group">
              <label>Platform</label>
              <InputText
                value={form.platform}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    platform: event.target.value,
                  }))
                }
                placeholder="linux"
              />
            </div>

            <div className="release-form-group">
              <label>Architecture</label>
              <InputText
                value={form.architecture}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    architecture: event.target.value,
                  }))
                }
                placeholder="amd64"
              />
            </div>
          </div>

          <div className="release-form-group">
            <label>Download URL</label>
            <InputText
              value={form.download_url}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  download_url: event.target.value,
                }))
              }
              placeholder="https://your-domain.com/releases/opsradar-agent-v1.0.3-linux-amd64"
            />
          </div>

          <div className="release-form-group">
            <label>Checksum</label>
            <InputText
              value={form.checksum}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  checksum: event.target.value,
                }))
              }
              placeholder="sha256 checksum"
            />
          </div>

          <div className="release-form-group">
            <label>Release Notes</label>
            <InputTextarea
              value={form.notes}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  notes: event.target.value,
                }))
              }
              rows={5}
              autoResize
              placeholder="What changed in this release?"
            />
          </div>

          <div className="release-dialog-footer">
            <Button
              label="Cancel"
              icon="pi pi-times"
              outlined
              onClick={() => {
                setCreateDialogVisible(false);
                setForm(emptyForm);
              }}
            />

            <Button
              label="Create Release"
              icon="pi pi-check"
              onClick={createRelease}
              loading={saving}
            />
          </div>
        </div>
      </Dialog>

      <Dialog
        header="Release Details"
        visible={detailsDialogVisible}
        onHide={() => setDetailsDialogVisible(false)}
        className="release-dialog release-details-dialog"
        modal
      >
        {selectedRelease ? (
          <div className="release-details">
            <div className="release-details-top">
              <div className="release-icon large">
                <i className="pi pi-cloud-upload" />
              </div>

              <div>
                <h3>{selectedRelease.version}</h3>
                <p>{selectedRelease.title || "Agent release package"}</p>

                <Tag
                  value={
                    selectedRelease.is_active ||
                    selectedRelease.status === "active"
                      ? "active"
                      : selectedRelease.status || "inactive"
                  }
                  severity={statusSeverity(selectedRelease)}
                  rounded
                />
              </div>
            </div>

            <Divider />

            <div className="release-details-grid">
              <div>
                <span>Release ID</span>
                <strong>{selectedRelease.id}</strong>
              </div>

              <div>
                <span>Version</span>
                <strong>{selectedRelease.version}</strong>
              </div>

              <div>
                <span>Platform</span>
                <strong>{selectedRelease.platform || "linux"}</strong>
              </div>

              <div>
                <span>Architecture</span>
                <strong>{selectedRelease.architecture || "amd64"}</strong>
              </div>

              <div>
                <span>Created At</span>
                <strong>{formatDate(selectedRelease.created_at)}</strong>
              </div>

              <div>
                <span>Activated At</span>
                <strong>{formatDate(selectedRelease.activated_at)}</strong>
              </div>
            </div>

            <div className="release-url-box">
              <div className="release-url-header">
                <div>
                  <strong>Download URL</strong>
                  <small>Used by agents during update checks.</small>
                </div>

                <Button
                  label="Copy"
                  icon="pi pi-copy"
                  size="small"
                  onClick={() =>
                    copyText(
                      selectedRelease.download_url || selectedRelease.file_url
                    )
                  }
                />
              </div>

              <pre>{selectedRelease.download_url || selectedRelease.file_url || "—"}</pre>
            </div>

            {selectedRelease.checksum && (
              <div className="release-url-box">
                <div className="release-url-header">
                  <div>
                    <strong>Checksum</strong>
                    <small>Used to verify the downloaded release.</small>
                  </div>

                  <Button
                    label="Copy"
                    icon="pi pi-copy"
                    size="small"
                    onClick={() => copyText(selectedRelease.checksum)}
                  />
                </div>

                <pre>{selectedRelease.checksum}</pre>
              </div>
            )}

            {(selectedRelease.notes || selectedRelease.description) && (
              <div className="release-notes-box">
                <strong>Release Notes</strong>
                <p>{selectedRelease.notes || selectedRelease.description}</p>
              </div>
            )}

            {!selectedRelease.is_active &&
              selectedRelease.status !== "active" && (
                <div className="release-details-footer">
                  <Button
                    label="Set as Active Release"
                    icon="pi pi-bolt"
                    onClick={() => activateRelease(selectedRelease)}
                    loading={saving}
                  />
                </div>
              )}
          </div>
        ) : (
          <p>No release selected</p>
        )}
      </Dialog>
    </div>
  );
}