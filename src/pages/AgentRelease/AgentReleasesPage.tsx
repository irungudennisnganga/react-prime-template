import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Divider } from "primereact/divider";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";
import { Toast } from "primereact/toast";
import { Toolbar } from "primereact/toolbar";
import { Message } from "primereact/message";

import {
  AgentRelease,
  agentReleasesApi,
  CreateAgentReleasePayload,
} from "../../services/api";

import AgentReleaseActionsMenu from "../../components/ui/AgentReleaseActionsMenu";

import "./agent.css";

type FormState = {
  version: string;
  os: string;
  arch: string;
  channel: string;
  binary_path: string;
  download_url: string;
  sha256: string;
  release_notes: string;
  mandatory: boolean;
};

const emptyForm: FormState = {
  version: "",
  os: "linux",
  arch: "amd64",
  channel: "stable",
  binary_path: "",
  download_url: "",
  sha256: "",
  release_notes: "",
  mandatory: false,
};

const osOptions = [
  { label: "Linux", value: "linux" },
  { label: "Windows", value: "windows" },
  { label: "macOS / Darwin", value: "darwin" },
];

const archOptions = [
  { label: "AMD64 / x86_64", value: "amd64" },
  { label: "ARM64", value: "arm64" },
  { label: "386 / x86", value: "386" },
];

const channelOptions = [
  { label: "Stable", value: "stable" },
  { label: "Beta", value: "beta" },
  { label: "Dev", value: "dev" },
];

function normalizeText(value?: string) {
  return String(value || "").trim();
}

function getReleaseOS(release: AgentRelease) {
  return release.os || release.platform || "linux";
}

function getReleaseArch(release: AgentRelease) {
  return release.arch || release.architecture || "amd64";
}

function getReleaseChannel(release: AgentRelease) {
  return release.channel || "stable";
}

function getReleaseNotes(release: AgentRelease) {
  return release.release_notes || release.notes || release.description || "";
}

function getReleaseChecksum(release: AgentRelease) {
  return release.sha256 || release.checksum || "";
}

function getReleaseUrl(release: AgentRelease) {
  return release.download_url || release.file_url || "";
}

function isReleaseActive(release: AgentRelease) {
  return Boolean(release.is_active || release.active || release.status === "active");
}

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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
    const active = releases.filter(isReleaseActive).length;
    const linux = releases.filter((release) => getReleaseOS(release) === "linux")
      .length;
    const latest = releases[0]?.version || "—";

    return {
      total,
      active,
      linux,
      latest,
    };
  }, [releases]);

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!normalizeText(form.version)) {
      nextErrors.version = "Version is required";
    }

    if (!normalizeText(form.os)) {
      nextErrors.os = "OS is required";
    }

    if (!normalizeText(form.arch)) {
      nextErrors.arch = "Architecture is required";
    }

    if (!normalizeText(form.channel)) {
      nextErrors.channel = "Channel is required";
    }

    if (!normalizeText(form.download_url)) {
      nextErrors.download_url = "Download URL is required";
    }

    if (!normalizeText(form.sha256)) {
      nextErrors.sha256 = "SHA256 checksum is required";
    }

    setFormErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const resetCreateDialog = () => {
    setForm(emptyForm);
    setFormErrors({});
    setCreateDialogVisible(false);
  };

  const createRelease = async () => {
    if (!validateForm()) {
      toast.current?.show({
        severity: "warn",
        summary: "Missing required fields",
        detail: "Please fill all required release fields.",
      });
      return;
    }

    try {
      setSaving(true);

      const payload: CreateAgentReleasePayload = {
        version: normalizeText(form.version),
        os: normalizeText(form.os).toLowerCase(),
        arch: normalizeText(form.arch).toLowerCase(),
        channel: normalizeText(form.channel).toLowerCase(),
        binary_path: normalizeText(form.binary_path),
        download_url: normalizeText(form.download_url),
        sha256: normalizeText(form.sha256).toLowerCase(),
        release_notes: normalizeText(form.release_notes),
        mandatory: Boolean(form.mandatory),
      };

      const response = await agentReleasesApi.create(payload);

      toast.current?.show({
        severity: "success",
        summary: "Created",
        detail: response.message || "Agent release created successfully",
      });

      resetCreateDialog();
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
          response.message ||
          `Release ${release.version} is now the active release`,
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
        detail: "No value available for this release",
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
    if (isReleaseActive(release)) return "success";
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
            {getReleaseNotes(release) || "Agent release package"}
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
          {getReleaseOS(release)}
        </span>

        <span className="release-arch-badge">
          <i className="pi pi-microchip" />
          {getReleaseArch(release)}
        </span>

        <span className="release-arch-badge">
          <i className="pi pi-send" />
          {getReleaseChannel(release)}
        </span>
      </div>
    );
  };

  const statusTemplate = (release: AgentRelease) => {
    const active = isReleaseActive(release);

    return (
      <Tag
        value={active ? "active" : release.status || "inactive"}
        severity={statusSeverity(release)}
        rounded
        className="release-status-tag"
      />
    );
  };

  const urlTemplate = (release: AgentRelease) => {
    const url = getReleaseUrl(release);

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
        onCopyUrl={(item) => copyText(getReleaseUrl(item))}
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
        onHide={resetCreateDialog}
        className="release-dialog"
        modal
      >
        <div className="release-form">
          <Message
            severity="info"
            text="Create a release using the exact fields required by the backend: version, OS, architecture, channel, download URL and SHA256 checksum."
            className="release-info-message"
          />

          <div className="release-form-grid">
            <div className="release-form-group">
              <label>
                Version <span className="required">*</span>
              </label>

              <InputText
                value={form.version}
                className={formErrors.version ? "p-invalid" : ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    version: event.target.value,
                  }))
                }
                placeholder="Example: 1.1.7"
              />

              {formErrors.version && (
                <small className="input-error">{formErrors.version}</small>
              )}
            </div>

            <div className="release-form-group">
              <label>
                Operating System <span className="required">*</span>
              </label>

              <Dropdown
                value={form.os}
                options={osOptions}
                className={formErrors.os ? "p-invalid w-full" : "w-full"}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    os: event.value,
                  }))
                }
                placeholder="Select OS"
              />

              {formErrors.os && (
                <small className="input-error">{formErrors.os}</small>
              )}
            </div>

            <div className="release-form-group">
              <label>
                Architecture <span className="required">*</span>
              </label>

              <Dropdown
                value={form.arch}
                options={archOptions}
                className={formErrors.arch ? "p-invalid w-full" : "w-full"}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    arch: event.value,
                  }))
                }
                placeholder="Select architecture"
              />

              {formErrors.arch && (
                <small className="input-error">{formErrors.arch}</small>
              )}
            </div>

            <div className="release-form-group">
              <label>
                Channel <span className="required">*</span>
              </label>

              <Dropdown
                value={form.channel}
                options={channelOptions}
                className={formErrors.channel ? "p-invalid w-full" : "w-full"}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    channel: event.value,
                  }))
                }
                placeholder="Select channel"
              />

              {formErrors.channel && (
                <small className="input-error">{formErrors.channel}</small>
              )}
            </div>
          </div>

          <div className="release-form-group">
            <label>Binary Path</label>

            <InputText
              value={form.binary_path}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  binary_path: event.target.value,
                }))
              }
              placeholder="/var/www/opsradar/releases/opsradar-agent-linux-amd64"
            />

            <small className="release-form-hint">
              Optional backend/internal path where the binary is stored.
            </small>
          </div>

          <div className="release-form-group">
            <label>
              Download URL <span className="required">*</span>
            </label>

            <InputText
              value={form.download_url}
              className={formErrors.download_url ? "p-invalid" : ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  download_url: event.target.value,
                }))
              }
              placeholder="https://api-opsradar.tekvancesolutions.co.ke/opsradar-agent-linux-amd64"
            />

            {formErrors.download_url && (
              <small className="input-error">{formErrors.download_url}</small>
            )}
          </div>

          <div className="release-form-group">
            <label>
              SHA256 Checksum <span className="required">*</span>
            </label>

            <InputText
              value={form.sha256}
              className={formErrors.sha256 ? "p-invalid" : ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  sha256: event.target.value,
                }))
              }
              placeholder="Example: 3f786850e387550fdab836ed7e6dc881de23001b..."
            />

            {formErrors.sha256 && (
              <small className="input-error">{formErrors.sha256}</small>
            )}
          </div>

          <div className="release-form-group">
            <label>Release Notes</label>

            <InputTextarea
              value={form.release_notes}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  release_notes: event.target.value,
                }))
              }
              rows={5}
              autoResize
              placeholder="What changed in this release?"
            />
          </div>

          <label className="release-checkbox-row">
            <Checkbox
              checked={form.mandatory}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  mandatory: Boolean(event.checked),
                }))
              }
            />

            <span>Mandatory release</span>
          </label>

          <div className="release-dialog-footer">
            <Button
              label="Cancel"
              icon="pi pi-times"
              outlined
              onClick={resetCreateDialog}
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

                <p>{getReleaseNotes(selectedRelease) || "Agent release package"}</p>

                <Tag
                  value={isReleaseActive(selectedRelease) ? "active" : "inactive"}
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
                <span>OS</span>
                <strong>{getReleaseOS(selectedRelease)}</strong>
              </div>

              <div>
                <span>Architecture</span>
                <strong>{getReleaseArch(selectedRelease)}</strong>
              </div>

              <div>
                <span>Channel</span>
                <strong>{getReleaseChannel(selectedRelease)}</strong>
              </div>

              <div>
                <span>Mandatory</span>
                <strong>{selectedRelease.mandatory ? "Yes" : "No"}</strong>
              </div>

              <div>
                <span>Created At</span>
                <strong>{formatDate(selectedRelease.created_at)}</strong>
              </div>

              <div>
                <span>Updated At</span>
                <strong>{formatDate(selectedRelease.updated_at)}</strong>
              </div>
            </div>

            {selectedRelease.binary_path && (
              <div className="release-url-box">
                <div className="release-url-header">
                  <div>
                    <strong>Binary Path</strong>
                    <small>Internal/backend location of the release binary.</small>
                  </div>

                  <Button
                    label="Copy"
                    icon="pi pi-copy"
                    size="small"
                    onClick={() => copyText(selectedRelease.binary_path)}
                  />
                </div>

                <pre>{selectedRelease.binary_path}</pre>
              </div>
            )}

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
                  onClick={() => copyText(getReleaseUrl(selectedRelease))}
                />
              </div>

              <pre>{getReleaseUrl(selectedRelease) || "—"}</pre>
            </div>

            {getReleaseChecksum(selectedRelease) && (
              <div className="release-url-box">
                <div className="release-url-header">
                  <div>
                    <strong>SHA256 Checksum</strong>
                    <small>Used to verify the downloaded release.</small>
                  </div>

                  <Button
                    label="Copy"
                    icon="pi pi-copy"
                    size="small"
                    onClick={() => copyText(getReleaseChecksum(selectedRelease))}
                  />
                </div>

                <pre>{getReleaseChecksum(selectedRelease)}</pre>
              </div>
            )}

            {getReleaseNotes(selectedRelease) && (
              <div className="release-notes-box">
                <strong>Release Notes</strong>
                <p>{getReleaseNotes(selectedRelease)}</p>
              </div>
            )}

            {!isReleaseActive(selectedRelease) && (
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