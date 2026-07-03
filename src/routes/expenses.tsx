import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-layout";
import { ExpensesView } from "@/components/expenses-view";

export const Route = createFileRoute("/expenses")({ component: ExpensesPage });

function ExpensesPage() {
  return (
    <ExpensesView
      headerSlot={(addButton) => (
        <PageHeader
          title="Расходы"
          description="Все расходы по объектам"
          actions={addButton}
        />
      )}
    />
  );
}