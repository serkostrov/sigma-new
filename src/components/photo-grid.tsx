import { Link } from "@tanstack/react-router";
import type { PhotoReport } from "@/lib/photos-api";
import { PHOTO_REVIEW_APPROVED, PHOTO_REVIEW_REJECTED } from "@/lib/photos-api";
import { ColoredBadge } from "@/components/colored-badge";

const REVIEW_COLORS: Record<string, string> = {
  "Не проверен": "#64748b",
  [PHOTO_REVIEW_APPROVED]: "#10b981",
  [PHOTO_REVIEW_REJECTED]: "#ef4444",
};

export function PhotoGrid({ photos, empty = "Фотоотчетов нет" }: { photos: PhotoReport[]; empty?: string }) {
  if (photos.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-8">{empty}</div>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {photos.map((p) => (
        <Link
          key={p.id}
          to="/photos/$photoId"
          params={{ photoId: p.id }}
          className="border border-border rounded-xl overflow-hidden bg-card hover:border-primary/60 hover:shadow-md transition block"
        >
          {p.images && p.images.length > 0 ? (
            <img src={p.images[0]} alt={p.note} className="aspect-[16/10] w-full object-cover" />
          ) : (
            <div className={`aspect-[16/10] bg-gradient-to-br ${p.thumb}`} />
          )}
          <div className="p-3">
            <div className="font-medium text-sm">{p.note}</div>
            <div className="text-xs text-muted-foreground mt-1">{p.author} · {p.date}</div>
            <div className="flex items-center justify-between mt-2 gap-2">
              <span className="text-xs text-primary">{p.count} фото</span>
              <ColoredBadge
                name={p.reviewStatus}
                color={REVIEW_COLORS[p.reviewStatus] ?? "#64748b"}
              />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}