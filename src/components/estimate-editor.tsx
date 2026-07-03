import { useMemo, useState } from "react";
import { Plus, Search, Trash2, FileText, X } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import {
  ESTIMATE_CATALOG,
  ESTIMATE_SECTIONS,
  formatMoney,
  objectById,
  sumEstimate,
  sumEstimateAfterDiscount,
  type Estimate,
  type EstimateSection,
  type EstimateStatus,
} from "@/lib/demo-data";
import { useData } from "@/lib/data-store";
import { cn } from "@/lib/utils";

const STATUSES: EstimateStatus[] = ["Черновик", "Отправлена", "На согласовании", "Согласована"];

export function EstimateEditor({ estimateId }: { estimateId: string }) {
  const {
    estimates,
    addEstimateItem,
    setEstimateItemQty,
    removeEstimateItem,
    setEstimateDiscount,
    setEstimateStatus,
  } = useData();
  const estimate = estimates.find((e) => e.id === estimateId);
  const [section, setSection] = useState<EstimateSection | "Все">(ESTIMATE_SECTIONS[0]);
  const [query, setQuery] = useState("");
  const [showKP, setShowKP] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);

  if (!estimate) return <div className="text-sm text-muted-foreground">Смета не найдена</div>;
  const obj = objectById(estimate.objectId);

  const total = sumEstimate(estimate);
  const totalAfter = sumEstimateAfterDiscount(estimate);

  const sectionTotals = useMemo(() => {
    const map: Record<string, number> = {};
    estimate.items.forEach((i) => {
      map[i.section] = (map[i.section] || 0) + i.price * i.qty;
    });
    return map;
  }, [estimate.items]);

  const grouped = useMemo(() => {
    const m: Record<string, typeof estimate.items> = {};
    estimate.items.forEach((i) => {
      (m[i.section] ||= []).push(i);
    });
    return m;
  }, [estimate.items]);

  const filteredCatalog = useMemo(() => {
    return ESTIMATE_CATALOG.filter((c) => {
      const matchSection = section === "Все" || c.section === section;
      const q = query.trim().toLowerCase();
      const matchQuery = !q || c.name.toLowerCase().includes(q);
      return matchSection && matchQuery;
    });
  }, [section, query]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="font-semibold text-lg">{estimate.number}</div>
            <StatusBadge value={estimate.status} />
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Заказчик: {estimate.customer} · Менеджер: {estimate.manager} · Обновлена {estimate.updated}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={estimate.status}
            onChange={(e) => setEstimateStatus(estimate.id, e.target.value as EstimateStatus)}
            className="h-10 px-3 rounded-md border border-border bg-card text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={() => setShowCatalog(true)}
            className="md:hidden inline-flex items-center gap-2 h-10 px-4 rounded-md bg-card border border-border text-sm font-medium hover:bg-secondary"
          >
            <Plus className="w-4 h-4" /> Добавить работу
          </button>
          <button
            onClick={() => setShowKP(true)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            <FileText className="w-4 h-4" /> Сформировать КП
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
        {/* Items table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="font-semibold text-sm">Работы в смете</div>
            <span className="text-xs text-muted-foreground">{estimate.items.length} позиций</span>
          </div>
          {estimate.items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Смета пока пустая. Выберите раздел справа и добавьте работы.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {ESTIMATE_SECTIONS.filter((s) => grouped[s]?.length).map((sec) => (
                <div key={sec}>
                  <div className="px-4 py-2 bg-secondary/40 flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-wide text-muted-foreground">{sec}</span>
                    <span className="font-medium">{formatMoney(sectionTotals[sec] || 0)}</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-muted-foreground text-xs">
                      <tr className="text-left">
                        <th className="px-4 py-2 font-medium">Наименование</th>
                        <th className="px-2 py-2 font-medium hidden sm:table-cell">Ед.</th>
                        <th className="px-2 py-2 font-medium text-right hidden sm:table-cell">Цена</th>
                        <th className="px-2 py-2 font-medium text-center">Кол-во</th>
                        <th className="px-2 py-2 font-medium text-right">Сумма</th>
                        <th className="px-2 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {grouped[sec].map((it) => (
                        <tr key={it.id} className="border-t border-border">
                          <td className="px-4 py-2">{it.name}</td>
                          <td className="px-2 py-2 hidden sm:table-cell text-muted-foreground">{it.unit}</td>
                          <td className="px-2 py-2 text-right hidden sm:table-cell">{formatMoney(it.price)}</td>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              value={it.qty}
                              onChange={(e) => setEstimateItemQty(estimate.id, it.id, Number(e.target.value))}
                              className="w-20 h-8 px-2 text-center rounded-md border border-border bg-background"
                            />
                          </td>
                          <td className="px-2 py-2 text-right font-medium whitespace-nowrap">{formatMoney(it.price * it.qty)}</td>
                          <td className="px-2 py-2">
                            <button
                              onClick={() => removeEstimateItem(estimate.id, it.id)}
                              className="text-muted-foreground hover:text-red-600"
                              aria-label="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-border p-4 space-y-2 bg-secondary/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Итого по работам</span>
              <span className="font-medium">{formatMoney(total)}</span>
            </div>
            <div className="flex items-center justify-between text-sm gap-3">
              <span className="text-muted-foreground">Скидка, %</span>
              <input
                type="number"
                min={0}
                max={100}
                value={estimate.discount}
                onChange={(e) => setEstimateDiscount(estimate.id, Number(e.target.value))}
                className="w-20 h-8 px-2 text-right rounded-md border border-border bg-background"
              />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="font-semibold">Итог после скидки</span>
              <span className="text-xl font-semibold">{formatMoney(totalAfter)}</span>
            </div>
          </div>
        </div>

        {/* Catalog (desktop) */}
        <div className="hidden lg:block">
          <CatalogPanel
            section={section}
            setSection={setSection}
            query={query}
            setQuery={setQuery}
            filtered={filteredCatalog}
            onAdd={(c) => addEstimateItem(estimate.id, c)}
          />
        </div>
      </div>

      {/* Catalog modal (mobile) */}
      {showCatalog && (
        <div className="fixed inset-0 z-50 lg:hidden bg-black/40 flex items-end" onClick={() => setShowCatalog(false)}>
          <div className="bg-card w-full max-h-[85vh] rounded-t-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="font-semibold">Добавить работу</div>
              <button onClick={() => setShowCatalog(false)} className="p-1.5 -mr-1.5 rounded-md hover:bg-secondary"><X className="w-5 h-5" /></button>
            </div>
            <CatalogPanel
              embedded
              section={section}
              setSection={setSection}
              query={query}
              setQuery={setQuery}
              filtered={filteredCatalog}
              onAdd={(c) => addEstimateItem(estimate.id, c)}
            />
          </div>
        </div>
      )}

      {/* КП preview */}
      {showKP && obj && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 overflow-y-auto" onClick={() => setShowKP(false)}>
          <div className="bg-white text-slate-900 max-w-3xl mx-auto rounded-xl shadow-2xl my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200">
              <div className="text-xs uppercase tracking-wide text-slate-500">Предпросмотр КП</div>
              <button onClick={() => setShowKP(false)} className="p-1.5 rounded-md hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="text-2xl font-bold tracking-tight">СК СИГМА</div>
                  <div className="text-xs text-slate-500 mt-1">Строительная компания · Санкт-Петербург</div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div>Коммерческое предложение</div>
                  <div className="font-medium text-slate-900">{estimate.number}</div>
                  <div>от {estimate.updated}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 text-sm border-y border-slate-200 py-4 mb-6">
                <div>
                  <div className="text-xs text-slate-500">Объект</div>
                  <div className="font-medium">{obj.name}</div>
                  <div className="text-xs text-slate-500 mt-2">Адрес</div>
                  <div>{obj.address}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Заказчик</div>
                  <div className="font-medium">{estimate.customer}</div>
                  <div className="text-xs text-slate-500 mt-2">Менеджер</div>
                  <div>{estimate.manager}</div>
                </div>
              </div>
              <table className="w-full text-sm mb-4">
                <thead className="bg-slate-100 text-slate-600 text-xs">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">№</th>
                    <th className="text-left px-3 py-2 font-medium">Наименование</th>
                    <th className="text-left px-3 py-2 font-medium">Ед.</th>
                    <th className="text-right px-3 py-2 font-medium">Кол-во</th>
                    <th className="text-right px-3 py-2 font-medium">Цена</th>
                    <th className="text-right px-3 py-2 font-medium">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {ESTIMATE_SECTIONS.filter((s) => grouped[s]?.length).flatMap((s, gi) => [
                    <tr key={"h" + s} className="bg-slate-50">
                      <td colSpan={6} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">{s}</td>
                    </tr>,
                    ...grouped[s].map((it, i) => (
                      <tr key={it.id} className="border-b border-slate-100">
                        <td className="px-3 py-2 text-slate-500">{gi + 1}.{i + 1}</td>
                        <td className="px-3 py-2">{it.name}</td>
                        <td className="px-3 py-2 text-slate-500">{it.unit}</td>
                        <td className="px-3 py-2 text-right">{it.qty}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(it.price)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatMoney(it.price * it.qty)}</td>
                      </tr>
                    )),
                  ])}
                </tbody>
              </table>
              <div className="ml-auto max-w-xs space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Итого:</span><span>{formatMoney(total)}</span></div>
                {estimate.discount > 0 && (
                  <div className="flex justify-between text-emerald-700"><span>Скидка {estimate.discount}%:</span><span>−{formatMoney(total - totalAfter)}</span></div>
                )}
                <div className="flex justify-between border-t border-slate-300 pt-2 font-semibold text-lg">
                  <span>К оплате:</span><span>{formatMoney(totalAfter)}</span>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-500">
                Срок действия предложения — 14 дней. С уважением, команда СК СИГМА.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CatalogPanel({
  section,
  setSection,
  query,
  setQuery,
  filtered,
  onAdd,
  embedded,
}: {
  section: EstimateSection | "Все";
  setSection: (s: EstimateSection | "Все") => void;
  query: string;
  setQuery: (q: string) => void;
  filtered: typeof ESTIMATE_CATALOG;
  onAdd: (c: (typeof ESTIMATE_CATALOG)[number]) => void;
  embedded?: boolean;
}) {
  return (
    <div className={cn("bg-card border border-border rounded-xl flex flex-col", embedded && "border-0 rounded-none flex-1 min-h-0")}>
      <div className="p-4 border-b border-border space-y-3">
        <div className="font-semibold text-sm">Каталог работ</div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по работам"
            className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-background text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["Все", ...ESTIMATE_SECTIONS] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={cn(
                "px-2.5 py-1 rounded-full border text-xs",
                section === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className={cn("overflow-y-auto", embedded ? "flex-1" : "max-h-[480px]")}>
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => onAdd(c)}
            className="w-full text-left px-4 py-3 border-b border-border hover:bg-secondary/40 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.section} · {c.unit} · {formatMoney(c.price)}</div>
            </div>
            <Plus className="w-4 h-4 text-primary shrink-0" />
          </button>
        ))}
        {filtered.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Ничего не найдено</div>}
      </div>
    </div>
  );
}