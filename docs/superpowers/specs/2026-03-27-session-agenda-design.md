# Session Agenda / Itinerary Feature

**Date:** 2026-03-27
**Status:** Approved

## Summary

Add an ordered agenda (rundown/itinerary) to sessions. Each item is a plain text title. Items are drag-to-reorder in the admin form and displayed as a numbered list on the public session detail page.

---

## 1. Database

New migration file: `supabase/migrations/<timestamp>_add_session_agenda.sql` (timestamp generated at implementation time)

```sql
CREATE TABLE public.session_agenda (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_agenda_session_id ON public.session_agenda(session_id);
```

- `sort_order` is a zero-based integer. Items are sorted ascending.
- On save the full list is replaced: delete all rows for the session, then re-insert in order.
- CASCADE delete ensures agenda rows are removed when a session is deleted.

---

## 2. API

### Validation (Zod — `src/lib/validations/session.ts`)

Add to both `CreateSessionSchema` and `UpdateSessionSchema`:

```ts
agenda: z.array(z.object({ title: z.string().min(1).max(200) })).optional()
```

### GET `/api/admin/sessions/[id]`

Include agenda in the Supabase select:

```ts
session_agenda(id, title, sort_order)
```

Return items sorted by `sort_order` ascending.

### POST `/api/admin/sessions`

After inserting the session row, if `agenda` is provided, insert rows into `session_agenda` with `sort_order` equal to the array index.

### PATCH `/api/admin/sessions/[id]`

If `agenda` is present in the body:
1. Delete all existing `session_agenda` rows for the session.
2. Re-insert in array order with `sort_order` equal to index.

Same pattern as `programme_ids` handling.

---

## 3. SessionForm UI

**File:** `src/components/admin/SessionForm.tsx`

### Dependencies

Install `@dnd-kit/core` and `@dnd-kit/sortable` (not currently in package.json).

### Form State

Add to `SessionFormData`:

```ts
agenda: { _key: string; title: string }[]
```

`_key` is a client-side UUID used as the dnd-kit item id. It is not sent to the API.

### New Section

Below the Notes field, above the Save/Cancel buttons, add an **"Aturcara / Agenda"** section:

- A `SortableContext` wrapping the list of items.
- Each item row: `GripVertical` drag handle icon + text input + `X` delete button.
- **"+ Tambah Item / Add Item"** button appends a new blank item with a generated `_key`.
- On submit, send `agenda: form.agenda.map(({ title }) => ({ title }))`.

### When Editing

On form open for edit, populate `agenda` from the fetched `session_agenda` items (sorted by `sort_order`), mapping each to `{ _key: item.id, title: item.title }`.

---

## 4. Public Session Detail Page

**File:** The session detail page — `src/app/admin/(protected)/sessions/[id]/page.tsx` and any public-facing session view if one exists.

If `session.session_agenda` is non-empty, render:

```
Aturcara
Agenda

1. Opening Recitation
2. Tazkirah
3. Closing Du'a
```

Hidden entirely if no agenda items exist.

---

## Out of Scope

- Per-item times (session already has start/end time)
- Per-item speaker/presenter
- Agenda visible in the sessions list view
