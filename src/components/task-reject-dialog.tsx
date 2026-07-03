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

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (comment: string) => Promise<void>;
  pending?: boolean;
};

export function TaskRejectDialog({ open, onOpenChange, onConfirm, pending }: Props) {
  const [comment, setComment] = useState("");

  const submit = async () => {
    if (!comment.trim()) return;
    await onConfirm(comment.trim());
    setComment("");
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setComment("");
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Вернуть задачу с замечанием</DialogTitle>
        </DialogHeader>
        <div>
          <Label>Замечание *</Label>
          <Textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Опишите, что нужно исправить…"
            className="mt-1.5"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={!comment.trim() || pending} variant="destructive">
            {pending ? "Сохранение…" : "Вернуть задачу"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
