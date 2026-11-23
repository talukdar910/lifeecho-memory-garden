import { BookOpen, Feather, Image, Mic, Sparkles, Trash2, Video } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { PrivacyMenu } from "./privacy";
import { ReportButton, TranslateButton, type Translation } from "./memory-tools";
import { useAuth } from "@/lib/auth-context";
import {
  EMOTION_LABEL,
  KIND_LABEL,
  type Emotion,
  type MemoryKind,
  type Privacy,
} from "@/lib/memory-rules";

export interface MemoryLike {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  media_path: string | null;
  memory_date: string | null;
  created_at: string;
  emotion?: string | null;
  privacy?: string;
}

export const KIND_ICON: Record<MemoryKind, typeof BookOpen> = {
  story: BookOpen,
  experience: Sparkles,
  thought: Feather,
  photo: Image,
  video: Video,
  audio: Mic,
};

export function MemoryCard({
  memory,
  url,
  onDelete,
  onPrivacyChange,
  showPrivacy = false,
  reportable = false,
}: {
  memory: MemoryLike;
  url?: string | undefined;
  onDelete?: (() => void) | undefined;
  onPrivacyChange?: ((p: Privacy) => void) | undefined;
  showPrivacy?: boolean;
  /** Lets signed-in readers flag someone else's memory for review. */
  reportable?: boolean;
}) {
  const { user } = useAuth();
  const [translation, setTranslation] = useState<Translation | null>(null);
  const title = translation?.title ?? memory.title;
  const body = translation ? translation.body : memory.body;
  const kind = memory.kind as MemoryKind;
  const Icon = KIND_ICON[kind] ?? BookOpen;
  const privacy = memory.privacy as Privacy | undefined;
  return (
    <article className="glass-panel break-inside-avoid overflow-hidden rounded-2xl">
      {kind === "photo" && url && <img src={url} alt={memory.title} className="w-full object-cover" loading="lazy" />}
      {kind === "video" && url && <video src={url} controls preload="metadata" className="w-full bg-background" />}
      {(kind === "photo" || kind === "video") && !url && memory.media_path && (
        <div className="aspect-video w-full animate-pulse bg-muted" />
      )}
      <div className="p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex flex-wrap items-center gap-1.5 text-xs font-semibold tracking-wider text-primary uppercase">
            <Icon className="size-3.5" /> {KIND_LABEL[kind] ?? kind}
            {memory.memory_date && (
              <span className="font-medium text-muted-foreground normal-case">
                · {format(new Date(memory.memory_date), "d MMM yyyy")}
              </span>
            )}
          </span>
          <div className="flex items-center">
          {reportable && user && <ReportButton memoryId={memory.id} title={memory.title} />}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              aria-label="Delete memory"
            >
              <Trash2 />
            </Button>
          )}
          </div>
        </div>
        <h3 className="mt-2 text-2xl leading-tight font-semibold">{title}</h3>
        {kind === "audio" && url && <audio src={url} controls className="mt-4 w-full" />}
        {body && <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{body}</p>}
        {(memory.emotion || (showPrivacy && privacy) || user) && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {memory.emotion && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                {EMOTION_LABEL[memory.emotion as Emotion] ?? memory.emotion}
              </span>
            )}
            {showPrivacy && privacy && <PrivacyMenu value={privacy} onChange={onPrivacyChange} />}
            {user && <TranslateButton memoryId={memory.id} translation={translation} onChange={setTranslation} />}
          </div>
        )}
      </div>
    </article>
  );
}
