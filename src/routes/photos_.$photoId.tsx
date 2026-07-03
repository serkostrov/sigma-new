import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Camera, Pencil, Check, MessageSquareWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  usePhotos,
  useApprovePhoto,
  useRejectPhoto,
  PHOTO_REVIEW_PENDING,
  PHOTO_REVIEW_APPROVED,
  PHOTO_REVIEW_REJECTED,
} from "@/lib/photos-api";
import { useObject } from "@/lib/objects-api";
import { useTask } from "@/lib/tasks-api";
import { useObjectStage } from "@/lib/stages-api";
import { useAllUsers } from "@/lib/users-api";
import { useAuth } from "@/lib/auth-context";
import { usePermissions } from "@/lib/permissions";
import { PhotoLightbox } from "@/components/photo-lightbox";
import { PhotoEditDialog } from "@/components/photo-edit-dialog";
import { PhotoReviewDialog } from "@/components/photo-review-dialog";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { ColoredBadge } from "@/components/colored-badge";
import { toast } from "sonner";

export const Route = createFileRoute("/photos_/$photoId")({ component: PhotoReportPage });

const REVIEW_COLORS: Record<string, string> = {
  [PHOTO_REVIEW_PENDING]: "#64748b",
  [PHOTO_REVIEW_APPROVED]: "#10b981",
  [PHOTO_REVIEW_REJECTED]: "#ef4444",
};

function PhotoReportPage() {
  const { photoId } = useParams({ from: "/photos_/$photoId" });
  const navigate = useNavigate();
  const { data: photos = [] } = usePhotos();
  const photo = photos.find((p) => p.id === photoId);
  const { data: obj } = useObject(photo?.objectId);
  const { data: task } = useTask(photo?.taskId ?? undefined);
  const { data: stage } = useObjectStage(photo?.stageId ?? undefined);
  const { users } = useAllUsers();
  const { user } = useAuth();
  const { canReviewPhotos, canEditPhotos } = usePermissions();
  const approve = useApprovePhoto();
  const reject = useRejectPhoto();

  const [lightbox, setLightbox] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskDefaults, setTaskDefaults] = useState<{
    objectId?: string;
    stageId?: string;
    description?: string;
  }>({});

  if (!photo) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate({ to: "/" })}><ArrowLeft className="w-4 h-4 mr-1" /> Назад</Button>
        <div className="text-sm text-muted-foreground mt-6 text-center">Фотоотчет не найден</div>
      </div>
    );
  }

  const images = photo.images ?? [];
  const reviewer = users.find((u) => u.id === photo.reviewedBy);

  const handleApprove = async () => {
    if (!user) return;
    try {
      await approve.mutateAsync({ id: photo.id, reviewerId: user.id });
      toast.success("Фотоотчёт подтверждён");
    } catch (e: any) {
      toast.error(e?.message ?? "Ошибка");
    }
  };

  const handleReject = async (comment: string, createTask: boolean) => {
    if (!user) return;
    try {
      await reject.mutateAsync({ id: photo.id, reviewerId: user.id, comment });
      toast.success("Замечание сохранено");
      if (createTask) {
        setTaskDefaults({
          objectId: photo.objectId,
          stageId: photo.stageId ?? undefined,
          description: comment,
        });
        setTaskFormOpen(true);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Ошибка");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Назад
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 md:p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 grid place-items-center text-primary">
            <Camera className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold leading-tight">{photo.note}</h1>
            <div className="text-sm text-muted-foreground mt-1">
              {photo.author} · {photo.date} · {photo.count} фото
            </div>
            <div className="mt-2">
              <ColoredBadge
                name={photo.reviewStatus}
                color={REVIEW_COLORS[photo.reviewStatus] ?? "#64748b"}
              />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm">
              {obj && (
                <Link to="/objects/$objectId" params={{ objectId: obj.id }} className="text-primary hover:underline">
                  Объект: {obj.name}
                </Link>
              )}
              {stage && obj && (
                <Link
                  to="/objects/$objectId/stages/$stageId"
                  params={{ objectId: obj.id, stageId: stage.id }}
                  className="text-primary hover:underline"
                >
                  Этап: {stage.name}
                </Link>
              )}
              {task && (
                <Link
                  to="/tasks/$taskId"
                  params={{ taskId: task.id }}
                  className="text-primary hover:underline"
                >
                  Задача: {task.title}
                </Link>
              )}
            </div>
            {photo.reviewComment && (
              <div className="mt-4 p-3 rounded-lg border border-amber-200 bg-amber-50/80 text-sm">
                <div className="flex items-center gap-1 text-xs font-medium text-amber-800 mb-1">
                  <MessageSquareWarning className="w-3.5 h-3.5" /> Замечание
                </div>
                <div className="whitespace-pre-wrap">{photo.reviewComment}</div>
                {reviewer && (
                  <div className="text-xs text-muted-foreground mt-2">
                    {reviewer.label}
                    {photo.reviewedAt && ` · ${new Date(photo.reviewedAt).toLocaleString("ru-RU")}`}
                  </div>
                )}
              </div>
            )}
            {photo.reviewStatus === PHOTO_REVIEW_APPROVED && reviewer && (
              <div className="text-xs text-muted-foreground mt-2">
                Проверил: {reviewer.label}
                {photo.reviewedAt && ` · ${new Date(photo.reviewedAt).toLocaleString("ru-RU")}`}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {canEditPhotos && (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="w-4 h-4 mr-1" /> Редактировать
              </Button>
            )}
            {canReviewPhotos && photo.reviewStatus !== PHOTO_REVIEW_APPROVED && (
              <>
                <Button size="sm" onClick={handleApprove} disabled={approve.isPending}>
                  <Check className="w-4 h-4 mr-1" /> Подтвердить
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => setRejectOpen(true)}
                >
                  <MessageSquareWarning className="w-4 h-4 mr-1" /> Замечание
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.length > 0
          ? images.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setLightbox(i)}
                className="relative aspect-square rounded-lg overflow-hidden border border-border bg-secondary block hover:opacity-90 transition"
              >
                <img src={src} alt={`Фото ${i + 1}`} className="w-full h-full object-cover" />
                <div className="absolute bottom-1 right-2 text-[10px] font-medium text-white drop-shadow">
                  {i + 1}/{images.length}
                </div>
              </button>
            ))
          : Array.from({ length: photo.count }).map((_, i) => (
              <div
                key={i}
                className={`relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br ${photo.thumb} border border-border`}
              >
                <div className="absolute bottom-1 right-2 text-[10px] font-medium text-white/90 drop-shadow">
                  {i + 1}/{photo.count}
                </div>
              </div>
            ))}
      </div>
      <PhotoLightbox
        images={images}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onIndexChange={setLightbox}
      />
      <PhotoEditDialog open={editOpen} onClose={() => setEditOpen(false)} photo={photo} />
      <PhotoReviewDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={handleReject}
        pending={reject.isPending}
      />
      <TaskFormDialog
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        defaultObjectId={taskDefaults.objectId}
        defaultStageId={taskDefaults.stageId}
        defaultDescription={taskDefaults.description}
        lockContext
      />
    </div>
  );
}
