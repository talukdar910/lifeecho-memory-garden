<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Archive business rules (visibility default, upload limits, accepted media) live in `src/lib/memory-rules.ts` with tests in `src/test/memory-rules.test.ts`; why: one testable source for rules the owner cares about.
- Member data is read/written from the browser client under RLS inside `_authenticated` (client-only) routes; why: session lives in browser storage and RLS scopes every row to its owner.
- Media lives in the private `memories` bucket at `{owner_id}/{memories|avatar}/{file}` and is shown only via short-lived signed URLs (`useMediaUrls`); why: storage policies key off those folder segments.
- Public member pages (`/echo/$memberId`) load through `getPublicEcho` (publishable server client) and only return Public memories plus `public_member` basics; why: SSR head tags for shared links without exposing private data.
- A single auth listener lives in `AuthProvider` (`src/lib/auth-context.tsx`); why: avoids competing subscribers.
- Every page under `src/routes/_authenticated/` is a child of the pathless layout; never leave that folder without child routes, because a childless layout claims "/" and breaks the build.
- Member pages call `ensureCompleteProfile` in their loader so incomplete registrations are sent to `/profile?setup=true`; why: profile picture and other required fields are collected after first sign-in (including Google/Lovable sign-ins).

- Memory visibility (private / legacy / public) is enforced by RLS and the `can_view_media` storage check; `canViewMemory` in `memory-rules.ts` mirrors it for tests; why: one rule, enforced in the database.
- AI translation runs only in `translateMemory` (`src/lib/translate.functions.ts`, signed-in readers); it re-reads the memory under the reader's RLS before calling Lovable AI and caches results in `memory_translations` (server-only table); why: never translate what the reader can't see, and never pay twice.
- Admin panel data comes from `src/lib/admin.ts` via admin-only RLS policies, and admin writes go through security-definer RPCs that log to `audit_log`; why: the security log stays complete.
- The post-sign-in opening plays from `OpeningIntro` in `__root` via `playIntro()` / `armIntro()` (`src/lib/intro.ts`); why: one overlay works for email and redirecting OAuth sign-ins.

- Community feed and comment lists come from security-definer RPCs `community_feed` / `memory_comment_list` (Public, non-hidden memories of non-archived members only); likes/comments tables are RLS-gated by `is_public_memory`; why: author names without exposing profiles.
- The `/auth` guard validates with `getUser()` and clears stale local sessions before redirecting; why: a stale stored token caused a sign-in redirect loop.
- Archive pages use the `memorial` utilities in `styles.css`; `is_demo` stays internal (admin only), never shown to members.
