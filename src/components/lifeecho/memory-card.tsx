import { BookOpen, Image, Mic, Trash2, Video } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { KIND_LABEL, type MemoryKind } from "@/lib/memory-rules";

export interface MemoryLike {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  media_path: string | null;
  memory_date: string | null;
  created_at: string;
}

export const KIND_ICON = { story: BookOpen, photo: Image, video: Video, audio: Mic } as const;

export function MemoryCard({
  memory,
  url,
  onDelete,
}: {
  memory: MemoryLike;
  url?: string | undefined;
  onDelete?: (() => void) | undefined;
}) {
  const kind = memory.kind as MemoryKind;
  const Icon = KIND_ICON[kind] ?? BookOpen;
  return (
    <article className="glass-panel break-inside-avoid overflow-hidden rounded-2xl">
      {kind === "photo" && url && (
        <img src={url} alt={memory.title} className="w-full object-cover" loading="lazy" />
      )}
      {kind === "video" && url && (
        <video src={url} controls preload="metadata" className="w-full bg-background" />
      )}
      {(kind === "photo" || kind === "video") && !url && memory.media_path && (
        <div className="aspect-video w-full animate-pulse bg-muted" />
      )}
      <div className="p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-primary uppercase">
            <Icon className="size-3.5" /> {KIND_LABEL[kind] ?? kind}
            {memory.memory_date && (
              <span className="font-medium text-muted-foreground normal-case">· {format(new Date(memory.memory_date), "d MMM yyyy")}</span>
            )}
          </span>
          {onDelete && (
            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={onDelete} aria-label="Delete memory">
              <Trash2 />
            </Button>
          )}
        </div>
        <h3 className="mt-2 text-2xl leading-tight font-semibold">{memory.title}</h3>
        {kind === "audio" && url && <audio src={url} controls className="mt-4 w-full" />}
        {memory.body && <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{memory.body}</p>}
      </div>
    </article>
  );
}
