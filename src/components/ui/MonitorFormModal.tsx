import { FormEvent, useEffect, useState } from "react";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";

import FormInput from "./FormInput";
import { Monitor, MonitorPayload, MonitorType } from "../../services/api";

type MonitorFormModalProps = {
  visible: boolean;
  mode: "create" | "edit" | "view";
  monitor: Monitor | null;
  loading?: boolean;
  onHide: () => void;
  onSubmit: (payload: MonitorPayload) => void;
};

const monitorTypes: { label: string; value: MonitorType }[] = [
  { label: "Server", value: "server" },
  { label: "Domain", value: "domain" },
  { label: "URL", value: "url" },
];

export default function MonitorFormModal({
  visible,
  mode,
  monitor,
  loading = false,
  onHide,
  onSubmit,
}: MonitorFormModalProps) {
  const isViewMode = mode === "view";

  const [form, setForm] = useState<MonitorPayload>({
    name: "",
    type: "server",
    target: "",
    interval: 60,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible && monitor) {
      setForm({
        name: monitor.name || "",
        type: monitor.type || "server",
        target: monitor.target || "",
        interval: monitor.interval || 60,
      });
    }

    if (visible && !monitor) {
      setForm({
        name: "",
        type: "server",
        target: "",
        interval: 60,
      });
    }

    setErrors({});
  }, [visible, monitor]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      nextErrors.name = "Monitor name is required";
    }

    if (!form.type) {
      nextErrors.type = "Monitor type is required";
    }

    if (!form.target.trim()) {
      nextErrors.target = "Target is required";
    }

    if (!form.interval || Number(form.interval) < 10) {
      nextErrors.interval = "Interval should be at least 10 seconds";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (isViewMode) return;
    if (!validate()) return;

    onSubmit({
      ...form,
      interval: Number(form.interval),
    });
  };

  return (
    <Dialog
      header={
        mode === "create"
          ? "Create Monitor"
          : mode === "edit"
            ? "Update Monitor"
            : "View Monitor"
      }
      visible={visible}
      style={{ width: "min(520px, 95vw)" }}
      modal
      draggable={false}
      className="monitor-dialog"
      onHide={onHide}
    >
      <form onSubmit={handleSubmit} className="monitor-form">
        <FormInput
          label="Monitor Name"
          name="name"
          type="text"
          icon="pi pi-tag"
          value={form.name}
          placeholder="My"
          error={errors.name}
          onChange={(value) =>
            setForm((prev) => ({
              ...prev,
              name: value,
            }))
          }
        />

        <div className="form-field">
          <label>Type</label>

          <Dropdown
            value={form.type}
            options={monitorTypes}
            optionLabel="label"
            optionValue="value"
            disabled={isViewMode}
            placeholder="Select monitor type"
            className={errors.type ? "w-full p-invalid" : "w-full"}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                type: event.value,
              }))
            }
          />

          {errors.type && <small className="input-error">{errors.type}</small>}
        </div>

        <FormInput
          label="Target"
          name="target"
          type="text"
          icon="pi pi-globe"
          value={form.target}
          placeholder="147.167.89.98"
          error={errors.target}
          onChange={(value) =>
            setForm((prev) => ({
              ...prev,
              target: value,
            }))
          }
        />

        <FormInput
          label="Interval Seconds"
          name="interval"
          type="text"
          icon="pi pi-clock"
          value={String(form.interval)}
          placeholder="60"
          error={errors.interval}
          onChange={(value) =>
            setForm((prev) => ({
              ...prev,
              interval: Number(value || 0),
            }))
          }
        />

        <div className="monitor-form-actions">
          <button type="button" className="secondary-btn" onClick={onHide}>
            Close
          </button>

          {!isViewMode && (
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? (
                <>
                  <i className="pi pi-spin pi-spinner" />
                  Saving...
                </>
              ) : mode === "create" ? (
                "Create Monitor"
              ) : (
                "Update Monitor"
              )}
            </button>
          )}
        </div>
      </form>
    </Dialog>
  );
}