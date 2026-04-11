import { InputHTMLAttributes } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  error?: string;
}

export default function FormField({ label, id, error, className, ...props }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-zinc-300">
        {label}
      </label>
      <input
        id={id}
        className={`w-full bg-zinc-800/60 border ${
          error ? "border-red-500" : "border-zinc-700"
        } rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors ${className ?? ""}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
