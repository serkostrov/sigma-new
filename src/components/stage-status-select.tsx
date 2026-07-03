import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColorDot, colorChipStyle } from "@/components/colored-badge";

export const STAGE_STATUSES = ["Не начат", "В работе", "Готово"] as const;
export type StageStatus = (typeof STAGE_STATUSES)[number];

const STAGE_COLORS: Record<string, string> = {
  "Не начат": "#64748b",
  "В работе": "#3b82f6",
  "Готово": "#10b981",
};

export function stageStatusColor(status: string) {
  return STAGE_COLORS[status] ?? "#64748b";
}

export function StageStatusSelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className={`h-7 w-[150px] px-2.5 text-xs font-medium border-0 rounded-full ${className ?? ""}`}
        style={colorChipStyle(stageStatusColor(value))}
        onClick={(e) => e.stopPropagation()}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STAGE_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            <span className="inline-flex items-center gap-2">
              <ColorDot color={stageStatusColor(s)} />
              {s}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}