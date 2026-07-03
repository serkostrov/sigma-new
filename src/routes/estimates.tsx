import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-layout";
import { StatusBadge } from "@/components/status-badge";
import { formatMoney, objectName, sumEstimateAfterDiscount } from "@/lib/demo-data";
import { useData } from "@/lib/data-store";

export const Route = createFileRoute("/estimates")({ component: EstimatesPage });

function EstimatesPage() {
  const { estimates } = useData();
  const total = estimates
    .filter((e) => e.status !== "Черновик")
    .reduce((s, e) => s + sumEstimateAfterDiscount(e), 0);
  return (
    <>
      <PageHeader
        title="Сметы"
        description={`Активных смет на сумму ${formatMoney(total)}`}
      />
      <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-muted-foreground">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Номер</th>
              <th className="px-4 py-3 font-medium">Объект</th>
              <th className="px-4 py-3 font-medium">Заказчик</th>
              <th className="px-4 py-3 font-medium">Менеджер</th>
              <th className="px-4 py-3 font-medium">Статус</th>
              <th className="px-4 py-3 font-medium">Обновлена</th>
              <th className="px-4 py-3 font-medium text-right">Сумма</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {estimates.map((e) => (
              <tr key={e.id} className="hover:bg-secondary/40">
                <td className="px-4 py-3 font-medium">
                  <Link to="/objects/$objectId" params={{ objectId: e.objectId }} className="hover:underline text-primary">
                    {e.number}
                  </Link>
                </td>
                <td className="px-4 py-3">{objectName(e.objectId)}</td>
                <td className="px-4 py-3">{e.customer}</td>
                <td className="px-4 py-3">{e.manager}</td>
                <td className="px-4 py-3"><StatusBadge value={e.status} /></td>
                <td className="px-4 py-3">{e.updated}</td>
                <td className="px-4 py-3 text-right font-medium">{formatMoney(sumEstimateAfterDiscount(e))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden space-y-3">
        {estimates.map((e) => (
          <Link key={e.id} to="/objects/$objectId" params={{ objectId: e.objectId }} className="block bg-card border border-border rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium">{e.number}</div>
                <div className="text-xs text-muted-foreground">{objectName(e.objectId)} · {e.customer}</div>
              </div>
              <StatusBadge value={e.status} />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground text-xs">{e.updated}</span>
              <span className="font-medium">{formatMoney(sumEstimateAfterDiscount(e))}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
