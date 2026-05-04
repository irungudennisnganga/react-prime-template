import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";

type FormInputProps = {
  label: string;
  name: string;
  type?: "text" | "email" | "password" | "tel";
  value: string;
  icon?: string;
  placeholder?: string;
  error?: string;
  onChange: (value: string) => void;
};

export default function FormInput({
  label,
  name,
  type = "text",
  value,
  icon,
  placeholder,
  error,
  onChange,
}: FormInputProps) {
  return (
    <div className="form-field">
      {label && <label htmlFor={name}>{label}</label>}

      <div className={error ? "form-input-shell invalid" : "form-input-shell"}>
        {icon && <i className={`form-input-icon ${icon}`} />}

        {type === "password" ? (
          <Password
            id={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            toggleMask
            feedback={false}
            className="form-password-wrapper"
            inputClassName="form-input-control"
          />
        ) : (
          <InputText
            id={name}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="form-input-control"
          />
        )}
      </div>

      {error && <small className="input-error">{error}</small>}
    </div>
  );
}