import { cn } from "@/lib/utils";

const MAP: Record<string, string> = {
  // Object statuses
  "Заявка": "bg-slate-100 text-slate-700 border-slate-200",
  "Замер": "bg-blue-50 text-blue-700 border-blue-200",
  "Смета": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Согласование": "bg-amber-50 text-amber-800 border-amber-200",
  "В работе": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Пауза": "bg-orange-50 text-orange-700 border-orange-200",
  "Завершен": "bg-slate-200 text-slate-700 border-slate-300",
  // Task statuses
  "Не начата": "bg-slate-100 text-slate-700 border-slate-200",
  "Назначена": "bg-slate-100 text-slate-700 border-slate-200",
  "Ожидание": "bg-amber-50 text-amber-800 border-amber-200",
  "На проверке": "bg-amber-50 text-amber-800 border-amber-200",
  "Выполнена": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Есть проблема": "bg-red-50 text-red-700 border-red-200",
  // Stage statuses
  "Не начат": "bg-slate-100 text-slate-700 border-slate-200",
  "Готово": "bg-emerald-50 text-emerald-700 border-emerald-200",
  // Estimate
  "Черновик": "bg-slate-100 text-slate-700 border-slate-200",
  "Отправлена": "bg-blue-50 text-blue-700 border-blue-200",
  "На согласовании": "bg-amber-50 text-amber-800 border-amber-200",
  "Согласована": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Закрыта": "bg-slate-200 text-slate-700 border-slate-300",
  // Tool status
  "Свободен": "bg-slate-100 text-slate-700 border-slate-200",
  "На объекте": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "В ремонте": "bg-red-50 text-red-700 border-red-200",
  "Потерян": "bg-red-100 text-red-800 border-red-300",
  "Списан": "bg-slate-200 text-slate-700 border-slate-300",
  // Tool condition
  "Рабочее": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Требует проверки": "bg-amber-50 text-amber-800 border-amber-200",
  "Повреждено": "bg-orange-50 text-orange-700 border-orange-200",
  "Неисправно": "bg-red-50 text-red-700 border-red-200",
  // Priority
  "Высокий": "bg-red-50 text-red-700 border-red-200",
  "Средний": "bg-amber-50 text-amber-800 border-amber-200",
  "Низкий": "bg-slate-100 text-slate-600 border-slate-200",
  "Важная": "bg-red-50 text-red-700 border-red-200",
  "Срочная": "bg-amber-50 text-amber-800 border-amber-200",
  "Несрочная": "bg-slate-100 text-slate-600 border-slate-200",
  // Health
  "Все в порядке": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Есть вопросы": "bg-amber-50 text-amber-800 border-amber-200",
  "Риск просрочки": "bg-red-50 text-red-700 border-red-200",
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  const cls = MAP[value] ?? "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap",
        cls,
        className,
      )}
    >
      {value}
    </span>
  );
}