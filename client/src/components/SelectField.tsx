import type { ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  label: string;
  ariaLabel: string;
  value: string;
  displayValue: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
};

export default function SelectField({
  label,
  ariaLabel,
  value,
  displayValue,
  onValueChange,
  disabled,
  children,
}: Props) {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger aria-label={ariaLabel} className="w-full">
          <SelectValue>{() => displayValue}</SelectValue>
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}
