import type { LucideIcon } from "lucide-react";
import type { InputHTMLAttributes } from "react";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  icon: LucideIcon;
  label: string;
}

export function InputField({ icon: Icon, id, label, ...inputProps }: InputFieldProps) {
  return (
    <div>
      <label className="form-label" htmlFor={id}>{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-nac-muted" size={19} aria-hidden="true" />
        <input className="form-input pl-11" id={id} {...inputProps} />
      </div>
    </div>
  );
}
