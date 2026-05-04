import { FormEvent, useEffect, useState } from "react";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { Checkbox } from "primereact/checkbox";

import FormInput from "./FormInput";
import {
  Agent,
  AgentServicePayload,
  AgentServiceType,
  getAgentId,
} from "../../services/api";

type AddServiceModalProps = {
  visible: boolean;
  loading: boolean;
  agents: Agent[];
  onHide: () => void;
  onSubmit: (payload: AgentServicePayload) => void;
};

const serviceTypes = [
  { label: "MongoDB", value: "mongodb" },
  { label: "Redis", value: "redis" },
  { label: "RabbitMQ", value: "rabbitmq" },
];

const statusOptions = [
  { label: "Enabled", value: true },
  { label: "Disabled", value: false },
];

function defaultSystemService(type: AgentServiceType) {
  if (type === "redis") return "redis-server";
  if (type === "rabbitmq") return "rabbitmq-server";

  return "mongod";
}

function defaultPort(type: AgentServiceType) {
  if (type === "redis") return 6379;
  if (type === "rabbitmq") return 5672;

  return 27017;
}

function getInitialForm(): AgentServicePayload {
  return {
    agent_id: "",
    name: "",
    service_type: "mongodb",
    system_service: "mongod",
    host: "127.0.0.1",
    port: 27017,
    username: "",
    password: "",
    database_name: "admin",
    rabbitmq_vhost: "/",
    check_interval_sec: 60,
    enabled: true,
    auto_restart: true,
  };
}

export default function AddServiceModal({
  visible,
  loading,
  agents,
  onHide,
  onSubmit,
}: AddServiceModalProps) {
  const [form, setForm] = useState<AgentServicePayload>(getInitialForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const agentOptions = agents
    .map((agent) => {
      const id = getAgentId(agent);

      return {
        label: `${agent.name}${agent.site ? ` - ${agent.site}` : ""}`,
        value: id,
      };
    })
    .filter((agent) => Boolean(agent.value));

  useEffect(() => {
    if (visible) {
      setErrors({});

      setForm((prev) => ({
        ...prev,
        agent_id:
          prev.agent_id ||
          (agentOptions.length > 0 ? String(agentOptions[0].value) : ""),
      }));
    }
  }, [visible, agents]);

  const updateServiceType = (type: AgentServiceType) => {
    setForm((prev) => ({
      ...prev,
      service_type: type,
      system_service: defaultSystemService(type),
      port: defaultPort(type),
      database_name: type === "mongodb" ? prev.database_name || "admin" : "",
      rabbitmq_vhost: type === "rabbitmq" ? prev.rabbitmq_vhost || "/" : "",
    }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.agent_id) {
      nextErrors.agent_id = "Agent is required";
    }

    if (!form.name.trim()) {
      nextErrors.name = "Service name is required";
    }

    if (!form.service_type) {
      nextErrors.service_type = "Service type is required";
    }

    if (!form.system_service.trim()) {
      nextErrors.system_service = "System service is required";
    }

    if (!form.host.trim()) {
      nextErrors.host = "Host is required";
    }

    if (!form.port || Number(form.port) <= 0) {
      nextErrors.port = "Valid port is required";
    }

    if (!form.check_interval_sec || Number(form.check_interval_sec) <= 0) {
      nextErrors.check_interval_sec = "Check interval is required";
    }

    if (form.service_type === "mongodb" && !form.database_name?.trim()) {
      nextErrors.database_name = "Database name is required";
    }

    if (form.service_type === "rabbitmq" && !form.rabbitmq_vhost?.trim()) {
      nextErrors.rabbitmq_vhost = "RabbitMQ vhost is required";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();

    if (!validate()) return;

    const payload: AgentServicePayload = {
      ...form,
      agent_id: form.agent_id,
      name: form.name.trim(),
      service_type: form.service_type,
      system_service: form.system_service.trim(),
      host: form.host.trim(),
      port: Number(form.port),
      username: form.username?.trim() || "",
      password: form.password || "",
      database_name:
        form.service_type === "mongodb"
          ? form.database_name?.trim() || "admin"
          : "",
      rabbitmq_vhost:
        form.service_type === "rabbitmq"
          ? form.rabbitmq_vhost?.trim() || "/"
          : "",
      check_interval_sec: Number(form.check_interval_sec),
      enabled: Boolean(form.enabled),
      auto_restart: Boolean(form.auto_restart),
    };

    console.log("[AddServiceModal] submit payload", payload);

    onSubmit(payload);
  };

  return (
    <Dialog
      header="Add Service"
      visible={visible}
      modal
      draggable={false}
      style={{ width: "min(760px, 95vw)" }}
      className="service-dialog"
      onHide={onHide}
    >
      <form className="service-form" onSubmit={submit}>
        <p className="service-dialog-subtitle">
          Create a monitored service for an agent.
        </p>

        <div className="service-form-grid">
          <div className="form-field">
            <label>Agent</label>

            <Dropdown
              value={form.agent_id}
              options={agentOptions}
              placeholder="Select agent"
              className={errors.agent_id ? "w-full p-invalid" : "w-full"}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  agent_id: String(event.value || ""),
                }))
              }
            />

            {errors.agent_id && (
              <small className="input-error">{errors.agent_id}</small>
            )}
          </div>

          <FormInput
            label="Service Name"
            name="name"
            type="text"
            icon="pi pi-bolt"
            value={form.name}
            placeholder="e.g. Primary MongoDB"
            error={errors.name}
            onChange={(value) =>
              setForm((prev) => ({
                ...prev,
                name: value,
              }))
            }
          />

          <div className="form-field">
            <label>Service Type</label>

            <Dropdown
              value={form.service_type}
              options={serviceTypes}
              placeholder="Select service type"
              className={errors.service_type ? "w-full p-invalid" : "w-full"}
              onChange={(event) => updateServiceType(event.value)}
            />

            {errors.service_type && (
              <small className="input-error">{errors.service_type}</small>
            )}
          </div>

          <FormInput
            label="System Service"
            name="system_service"
            type="text"
            icon="pi pi-cog"
            value={form.system_service}
            placeholder="mongod"
            error={errors.system_service}
            onChange={(value) =>
              setForm((prev) => ({
                ...prev,
                system_service: value,
              }))
            }
          />

          <FormInput
            label="Host"
            name="host"
            type="text"
            icon="pi pi-globe"
            value={form.host}
            placeholder="127.0.0.1"
            error={errors.host}
            onChange={(value) =>
              setForm((prev) => ({
                ...prev,
                host: value,
              }))
            }
          />

          <FormInput
            label="Port"
            name="port"
            type="text"
            icon="pi pi-hashtag"
            value={String(form.port)}
            placeholder="27017"
            error={errors.port}
            onChange={(value) =>
              setForm((prev) => ({
                ...prev,
                port: Number(value || 0),
              }))
            }
          />

          <FormInput
            label="Username"
            name="username"
            type="text"
            icon="pi pi-user"
            value={form.username || ""}
            placeholder="Optional username"
            onChange={(value) =>
              setForm((prev) => ({
                ...prev,
                username: value,
              }))
            }
          />

          <FormInput
            label="Password"
            name="password"
            type="password"
            icon="pi pi-lock"
            value={form.password || ""}
            placeholder="Optional password"
            onChange={(value) =>
              setForm((prev) => ({
                ...prev,
                password: value,
              }))
            }
          />

          {form.service_type === "mongodb" && (
            <FormInput
              label="Database Name"
              name="database_name"
              type="text"
              icon="pi pi-database"
              value={form.database_name || ""}
              placeholder="admin"
              error={errors.database_name}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  database_name: value,
                }))
              }
            />
          )}

          {form.service_type === "rabbitmq" && (
            <FormInput
              label="RabbitMQ VHost"
              name="rabbitmq_vhost"
              type="text"
              icon="pi pi-inbox"
              value={form.rabbitmq_vhost || ""}
              placeholder="/"
              error={errors.rabbitmq_vhost}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  rabbitmq_vhost: value,
                }))
              }
            />
          )}

          <FormInput
            label="Check Interval (sec)"
            name="check_interval_sec"
            type="text"
            icon="pi pi-clock"
            value={String(form.check_interval_sec)}
            placeholder="60"
            error={errors.check_interval_sec}
            onChange={(value) =>
              setForm((prev) => ({
                ...prev,
                check_interval_sec: Number(value || 0),
              }))
            }
          />

          <div className="form-field">
            <label>Status</label>

            <Dropdown
              value={form.enabled}
              options={statusOptions}
              placeholder="Select status"
              className="w-full"
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  enabled: Boolean(event.value),
                }))
              }
            />
          </div>
        </div>

        <label className="service-checkbox-row">
          <Checkbox
            checked={form.auto_restart}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                auto_restart: Boolean(event.checked),
              }))
            }
          />

          <span>Auto restart when service is down</span>
        </label>

        <div className="service-form-actions">
          <button type="button" className="secondary-btn" onClick={onHide}>
            Cancel
          </button>

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? (
              <>
                <i className="pi pi-spin pi-spinner" />
                Saving...
              </>
            ) : (
              "Save Service"
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}