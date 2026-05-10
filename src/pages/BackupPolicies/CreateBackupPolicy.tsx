import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./BackupPolicies.css";
import { useAppToast } from "../../components/ui/AppToast";
import {
  AgentService,
  agentServiceApi,
  backupPolicyApi,
  CreateBackupPolicyPayload,
  getAgentServiceAgentId,
  getAgentServiceId,
  getAgentServiceType,
} from "../../services/api";

const compressionOptions = [
  { label: "ZIP", value: "zip" },
  { label: "GZIP + OpenSSL Encryption", value: "gzip" },
];

const storageOptions = [
  { label: "Local Only", value: "local" },
  { label: "Rsync Remote Server", value: "rsync" },
  { label: "Rclone Cloud Drive", value: "rclone" },
];

const installOptions = [
  { label: "Report Only", value: "report_only" },
  { label: "Auto Detect Package Manager", value: "auto" },
  { label: "APT Only", value: "apt" },
];

function defaultSchedule() {
  return "0 2 * * *";
}

export default function CreateBackupPolicy() {
  const navigate = useNavigate();
  const { showToast } = useAppToast();

  const [services, setServices] = useState<AgentService[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [payload, setPayload] = useState<CreateBackupPolicyPayload>({
    agent_id: "",
    service_id: "",
    name: "",
    schedule: defaultSchedule(),
    compression: "zip",
    archive_password_enabled: false,
    archive_password: "",
    local_path: "/var/lib/opsradar-agent/backups",
    storage_type: "local",
    retention_days: 14,
    auto_install_tools: false,
    install_strategy: "report_only",
    rsync_enabled: false,
    rsync_host: "",
    rsync_port: 22,
    rsync_user: "",
    rsync_path: "",
    rsync_private_key: "",
    rclone_enabled: false,
    rclone_remote: "",
    rclone_path: "",
    rclone_config: "",
  });

  const selectedService = useMemo(() => {
    return services.find((service) => getAgentServiceId(service) === payload.service_id);
  }, [services, payload.service_id]);

  const predictedTools = useMemo(() => {
    const tools = new Set<string>();
    const type = selectedService ? getAgentServiceType(selectedService) : "";

    if (type === "postgresql") tools.add("pg_dump");
    if (type === "mysql") tools.add("mysqldump");
    if (type === "mongodb") tools.add("mongodump");
    if (type === "redis") tools.add("redis-cli");

    if (payload.compression === "zip") tools.add("zip");
    if (payload.compression === "gzip") {
      tools.add("gzip");
      tools.add("openssl");
    }

    if (payload.storage_type === "rsync" || payload.rsync_enabled) tools.add("rsync");
    if (payload.storage_type === "rclone" || payload.rclone_enabled) tools.add("rclone");

    return Array.from(tools);
  }, [selectedService, payload.compression, payload.storage_type, payload.rsync_enabled, payload.rclone_enabled]);

  const setField = <K extends keyof CreateBackupPolicyPayload>(
    key: K,
    value: CreateBackupPolicyPayload[K]
  ) => {
    setPayload((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const loadServices = async () => {
    try {
      const data = await agentServiceApi.view();
      setServices(data);
    } catch (error: any) {
      showToast(
        "error",
        "Failed to load services",
        error.response?.data?.message || error.message || "Could not fetch services."
      );
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    if (!selectedService) return;

    setPayload((prev) => ({
      ...prev,
      agent_id: getAgentServiceAgentId(selectedService),
    }));
  }, [selectedService]);

  useEffect(() => {
    const storageType = payload.storage_type;

    setPayload((prev) => ({
      ...prev,
      rsync_enabled: storageType === "rsync",
      rclone_enabled: storageType === "rclone",
    }));
  }, [payload.storage_type]);

  useEffect(() => {
    setPayload((prev) => ({
      ...prev,
      install_strategy: prev.auto_install_tools ? "auto" : "report_only",
    }));
  }, [payload.auto_install_tools]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!payload.service_id) {
      showToast("error", "Service required", "Select the service this backup policy belongs to.");
      return;
    }

    if (!payload.name.trim()) {
      showToast("error", "Name required", "Enter a backup policy name.");
      return;
    }

    if (!payload.schedule.trim()) {
      showToast("error", "Schedule required", "Enter a cron schedule.");
      return;
    }

    try {
      setSubmitting(true);

      await backupPolicyApi.create(payload);

      showToast(
        "success",
        "Backup policy created",
        "The policy has been saved and sent securely to the agent."
      );

      navigate("/backup-policies");
    } catch (error: any) {
      showToast(
        "error",
        "Failed to create backup policy",
        error.response?.data?.message || error.message || "Could not create backup policy."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="backup-page">
      <div className="backup-hero create">
        <div>
          <button type="button" className="agent-back-btn" onClick={() => navigate("/backup-policies")}>
            <i className="pi pi-arrow-left" />
            Back
          </button>

          <span className="backup-eyebrow">Create Backup Automation</span>
          <h1>New Backup Policy</h1>
          <p>
            Configure local backups, password-protected archives, dynamic tool installation,
            rsync, and rclone storage.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="backup-create-layout">
        <section className="backup-form-card">
          <div className="backup-form-section-title">
            <span className="gradient-icon purple">
              <i className="pi pi-server" />
            </span>
            <div>
              <h2>Service & Schedule</h2>
              <p>Select the monitored service and backup frequency.</p>
            </div>
          </div>

          <div className="backup-form-grid">
            <label>
              <span>Service</span>
              <select
                value={payload.service_id}
                onChange={(e) => setField("service_id", e.target.value)}
              >
                <option value="">Select service</option>
                {services.map((service) => (
                  <option key={getAgentServiceId(service)} value={getAgentServiceId(service)}>
                    {service.name} - {getAgentServiceType(service)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Policy Name</span>
              <input
                value={payload.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="e.g. Daily PostgreSQL Backup"
              />
            </label>

            <label>
              <span>Cron Schedule</span>
              <input
                value={payload.schedule}
                onChange={(e) => setField("schedule", e.target.value)}
                placeholder="0 2 * * *"
              />
            </label>

            <label>
              <span>Retention Days</span>
              <input
                type="number"
                min={1}
                value={payload.retention_days}
                onChange={(e) => setField("retention_days", Number(e.target.value))}
              />
            </label>
          </div>
        </section>

        <section className="backup-form-card">
          <div className="backup-form-section-title">
            <span className="gradient-icon orange">
              <i className="pi pi-lock" />
            </span>
            <div>
              <h2>Compression & Protection</h2>
              <p>Choose archive type and optional password protection.</p>
            </div>
          </div>

          <div className="backup-form-grid">
            <label>
              <span>Compression</span>
              <select
                value={payload.compression}
                onChange={(e) => setField("compression", e.target.value)}
              >
                {compressionOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Local Path</span>
              <input
                value={payload.local_path}
                onChange={(e) => setField("local_path", e.target.value)}
              />
            </label>

            <label className="backup-toggle-row">
              <input
                type="checkbox"
                checked={Boolean(payload.archive_password_enabled)}
                onChange={(e) => setField("archive_password_enabled", e.target.checked)}
              />
              <div>
                <strong>Password protect archive</strong>
                <small>Password is sent encrypted to the agent local vault.</small>
              </div>
            </label>

            {payload.archive_password_enabled ? (
              <label>
                <span>Archive Password</span>
                <input
                  type="password"
                  value={payload.archive_password}
                  onChange={(e) => setField("archive_password", e.target.value)}
                  placeholder="Enter archive password"
                />
              </label>
            ) : null}
          </div>
        </section>

        <section className="backup-form-card">
          <div className="backup-form-section-title">
            <span className="gradient-icon blue">
              <i className="pi pi-cloud-upload" />
            </span>
            <div>
              <h2>Storage Destination</h2>
              <p>Save locally, sync to another server, or push to cloud storage.</p>
            </div>
          </div>

          <div className="backup-form-grid">
            <label>
              <span>Storage Type</span>
              <select
                value={payload.storage_type}
                onChange={(e) => setField("storage_type", e.target.value)}
              >
                {storageOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {payload.storage_type === "rsync" ? (
            <div className="backup-form-grid nested">
              <label>
                <span>Rsync Host</span>
                <input
                  value={payload.rsync_host}
                  onChange={(e) => setField("rsync_host", e.target.value)}
                  placeholder="196.xxx.xxx.xxx"
                />
              </label>

              <label>
                <span>Rsync Port</span>
                <input
                  type="number"
                  value={payload.rsync_port}
                  onChange={(e) => setField("rsync_port", Number(e.target.value))}
                />
              </label>

              <label>
                <span>Rsync User</span>
                <input
                  value={payload.rsync_user}
                  onChange={(e) => setField("rsync_user", e.target.value)}
                  placeholder="backupuser"
                />
              </label>

              <label>
                <span>Rsync Path</span>
                <input
                  value={payload.rsync_path}
                  onChange={(e) => setField("rsync_path", e.target.value)}
                  placeholder="/home/backup/opsradar"
                />
              </label>

              <label className="full">
                <span>Private Key</span>
                <textarea
                  value={payload.rsync_private_key}
                  onChange={(e) => setField("rsync_private_key", e.target.value)}
                  placeholder="Paste SSH private key"
                  rows={6}
                />
              </label>
            </div>
          ) : null}

          {payload.storage_type === "rclone" ? (
            <div className="backup-form-grid nested">
              <label>
                <span>Rclone Remote</span>
                <input
                  value={payload.rclone_remote}
                  onChange={(e) => setField("rclone_remote", e.target.value)}
                  placeholder="company_gdrive"
                />
              </label>

              <label>
                <span>Rclone Path</span>
                <input
                  value={payload.rclone_path}
                  onChange={(e) => setField("rclone_path", e.target.value)}
                  placeholder="OpsRadarBackups/Tekvance"
                />
              </label>

              <label className="full">
                <span>Rclone Config</span>
                <textarea
                  value={payload.rclone_config}
                  onChange={(e) => setField("rclone_config", e.target.value)}
                  placeholder="Paste rclone.conf content"
                  rows={6}
                />
              </label>
            </div>
          ) : null}
        </section>

        <section className="backup-form-card">
          <div className="backup-form-section-title">
            <span className="gradient-icon green">
              <i className="pi pi-wrench" />
            </span>
            <div>
              <h2>Dynamic Tool Installation</h2>
              <p>Allow the agent to install missing backup tools only when required.</p>
            </div>
          </div>

          <div className="backup-tools-preview">
            <span>Required tools</span>
            <div>
              {predictedTools.length ? (
                predictedTools.map((tool) => <strong key={tool}>{tool}</strong>)
              ) : (
                <em>Select a service to preview tools.</em>
              )}
            </div>
          </div>

          <div className="backup-form-grid">
            <label className="backup-toggle-row">
              <input
                type="checkbox"
                checked={Boolean(payload.auto_install_tools)}
                onChange={(e) => setField("auto_install_tools", e.target.checked)}
              />
              <div>
                <strong>Auto install missing tools</strong>
                <small>Requires agent to run as root. Recommended only for trusted servers.</small>
              </div>
            </label>

            <label>
              <span>Install Strategy</span>
              <select
                value={payload.install_strategy}
                onChange={(e) => setField("install_strategy", e.target.value)}
              >
                {installOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <div className="backup-form-actions">
          <button type="button" className="secondary-btn" onClick={() => navigate("/backup-policies")}>
            Cancel
          </button>

          <button type="submit" className="backup-primary-btn" disabled={submitting}>
            <i className={submitting ? "pi pi-spin pi-spinner" : "pi pi-save"} />
            {submitting ? "Creating..." : "Create Backup Policy"}
          </button>
        </div>
      </form>
    </div>
  );
}