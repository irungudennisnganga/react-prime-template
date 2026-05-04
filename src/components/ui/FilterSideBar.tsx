import { FormEvent, useEffect, useState } from "react";
import { Dialog } from "primereact/dialog";
import FormInput from "./FormInput";
import { CreateAgentPayload } from "../../services/api";

type CreateAgentModalProps = {
  visible: boolean;
  loading: boolean;
  generatedCommand: string;
  onHide: () => void;
  onSubmit: (payload: CreateAgentPayload) => void;
  onCopyCommand: () => void;
};

export default function CreateAgentModal({
  visible,
  loading,
  generatedCommand,
  onHide,
  onSubmit,
  onCopyCommand,
}: CreateAgentModalProps) {
  const [form, setForm] = useState<CreateAgentPayload>({
    name: "",
    site: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      setErrors({});
    }
  }, [visible]);

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      nextErrors.name = "Agent name is required";
    }

    if (!form.site.trim()) {
      nextErrors.site = "Site is required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!validate()) return;

    onSubmit({
      name: form.name.trim(),
      site: form.site.trim(),
    });
  };

  return (
    <Dialog
      header="Create agent"
      visible={visible}
      modal
      draggable={false}
      style={{ width: "min(560px, 95vw)" }}
      className="agent-dialog"
      onHide={onHide}
    >
      <form className="agent-create-form" onSubmit={handleSubmit}>
        <p className="agent-modal-description">
          Create a new agent and generate an install command.
        </p>

        <FormInput
          label="Agent name"
          name="name"
          type="text"
          icon="pi pi-server"
          value={form.name}
          placeholder="Prod VPS 1"
          error={errors.name}
          onChange={(value) =>
            setForm((prev) => ({
              ...prev,
              name: value,
            }))
          }
        />

        <FormInput
          label="Site"
          name="site"
          type="text"
          icon="pi pi-building"
          value={form.site}
          placeholder="Nairobi DC"
          error={errors.site}
          onChange={(value) =>
            setForm((prev) => ({
              ...prev,
              site: value,
            }))
          }
        />

        {generatedCommand && (
          <div className="agent-command-box">
            <div>
              <strong>Install command</strong>
              <span>Run this command on the server you want to monitor.</span>
            </div>

            <pre>{generatedCommand}</pre>

            <button
              type="button"
              className="secondary-btn"
              onClick={onCopyCommand}
            >
              <i className="pi pi-copy" />
              Copy command
            </button>
          </div>
        )}

        <div className="agent-modal-actions">
          <button type="button" className="secondary-btn" onClick={onHide}>
            Cancel
          </button>

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? (
              <>
                <i className="pi pi-spin pi-spinner" />
                Creating...
              </>
            ) : (
              <>
                <i className="pi pi-plus" />
                Create agent
              </>
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}