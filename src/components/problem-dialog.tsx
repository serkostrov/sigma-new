import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useData } from "@/lib/data-store";
import { OBJECTS, FOREMAN_NAME } from "@/lib/demo-data";

export function ProblemDialog({
  open,
  onClose,
  defaultObjectId,
  author = FOREMAN_NAME,
}: {
  open: boolean;
  onClose: () => void;
  defaultObjectId?: string;
  author?: string;
}) {
  const { reportProblem } = useData();
  const [objectId, setObjectId] = useState(defaultObjectId ?? OBJECTS[0].id);
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);

  if (!open) return null;

  const submit = () => {
    if (!text.trim()) return;
    reportProblem(objectId, author, text.trim());
    setDone(true);
    setTimeout(() => {
      setDone(false);
      setText("");
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/50 p-0 sm:p-4">
      <div className="bg-card w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-border">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div className="font-semibold">Сообщить о проблеме</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary" aria-label="Закрыть">
            <X className="w-4 h-4" />
          </button>
        </div>
        {done ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center mx-auto text-2xl">✓</div>
            <div className="mt-3 font-semibold">Сообщение отправлено</div>
            <div className="text-sm text-muted-foreground mt-1">Руководитель получит уведомление</div>
          </div>
        ) : (
          <>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">Объект</label>
                <select
                  value={objectId}
                  onChange={(e) => setObjectId(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-md border border-border bg-card text-sm"
                >
                  {OBJECTS.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Что случилось?</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  placeholder="Опишите проблему..."
                  className="mt-1 w-full px-3 py-2 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="p-5 border-t border-border flex gap-2">
              <button onClick={onClose} className="flex-1 h-11 rounded-md border border-border bg-card text-sm font-medium hover:bg-secondary">
                Отмена
              </button>
              <button
                onClick={submit}
                disabled={!text.trim()}
                className="flex-[2] h-11 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                Отправить
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}