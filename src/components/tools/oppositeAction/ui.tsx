import type { ReactNode } from "react";
import type { FlowChoice } from "../../../data/oppositeActionTypes";
import { choiceButton, choiceSelected, inputField } from "./styles";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] space-y-3 ${className}`}
    >
      {children}
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <textarea
        maxLength={1500}
        rows={rows}
        className={inputField}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/** A vertical list of tappable graph choices (single select). */
export function ChoiceList({
  options,
  value,
  onSelect,
  label,
}: {
  options: FlowChoice[] | undefined;
  value: string;
  onSelect: (id: string, option: FlowChoice) => void;
  label?: string;
}) {
  return (
    <div className="space-y-2" role="group" aria-label={label}>
      {options?.map((o) => (
        <button
          type="button"
          key={o.id}
          aria-pressed={value === o.id}
          onClick={() => onSelect(o.id, o)}
          className={`${choiceButton} ${value === o.id ? choiceSelected : ""}`}
        >
          <span className="font-medium">
            {value === o.id && <span aria-hidden="true">✓ </span>}
            {o.label}
          </span>
          {o.detail && <span className="block text-sm mt-1">{o.detail}</span>}
        </button>
      ))}
    </div>
  );
}
