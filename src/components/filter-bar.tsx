import { Search, X } from "lucide-react";
import { ReactNode } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const FILTER_ALL = "__all__";

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Поиск",
  filters,
  extras,
  activeFiltersCount = 0,
  onReset,
  className,
}: {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  extras?: ReactNode;
  activeFiltersCount?: number;
  onReset?: () => void;
  className?: string;
}) {
  const hasSearch = typeof search === "string" && onSearchChange;
  return (
    <div className={cn("bg-card border border-border rounded-xl mb-4 p-3 space-y-3", className)}>
      {hasSearch && (
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground ml-2 shrink-0" />
          <input
            value={search}
            onChange={(e) => onSearchChange!(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex-1 bg-transparent text-sm focus:outline-none py-1.5"
          />
        </div>
      )}
      {(filters || extras) && (
        <div className="flex flex-wrap items-center gap-2">
          {filters}
          {extras}
        </div>
      )}
      {activeFiltersCount > 0 && onReset && (
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="w-3 h-3" /> Сбросить фильтры ({activeFiltersCount})
        </button>
      )}
    </div>
  );
}

export function FilterSelect({
  value, onChange, placeholder, options, className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: readonly (string | { value: string; label: string })[];
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-9 w-full sm:w-[180px] text-sm", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={FILTER_ALL}>{placeholder}: все</SelectItem>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return <SelectItem key={v} value={v}>{l}</SelectItem>;
        })}
      </SelectContent>
    </Select>
  );
}

export function FilterToggle({
  active, onToggle, children,
}: {
  active: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-2 h-9 px-3 rounded-md border text-sm transition-colors",
        active
          ? "bg-secondary border-border text-foreground"
          : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50",
      )}
    >
      {children}
    </button>
  );
}