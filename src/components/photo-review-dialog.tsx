import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (comment: string, createTask: boolean) => Promise<void>;
  pending?: boolean;
};

export function PhotoReviewDialog({ open, onOpenChange, onConfirm, pending }: Props) {
  const [comment, setComment] = useState("");
  const [createTask, setCreateTask] = useState(false);

  const submit = async () => {
    if (!comment.trim()) return;
    await onConfirm(comment.trim(), createTask);
    setComment("");
    setCreateTask(false);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setComment("");
          setCreateTask(false);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Замечание к фотоотчёту</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Текст замечания *</Label>
            <Textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Опишите замечание…"
              className="mt-1.5"
            />
          </div>
          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox
              checked={createTask}
              onCheckedChange={(v) => setCreateTask(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm leading-snug">
              Создать задачу на основе замечания после сохранения
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={!comment.trim() || pending} variant="destructive">
            {pending ? "Сохранение…" : "Сохранить замечание"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
