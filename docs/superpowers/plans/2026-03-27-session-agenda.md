# Session Agenda Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a drag-to-reorder agenda/itinerary to sessions, editable in the admin form and displayed on the session detail page.

**Architecture:** New `session_agenda` table stores ordered text items per session. API routes are extended to read/write agenda alongside existing session data. The form uses dnd-kit for drag reorder; the detail page renders a numbered list.

**Tech Stack:** Next.js App Router, Supabase (serviceClient), Zod, @dnd-kit/core + @dnd-kit/sortable, Tailwind CSS

---

## File Map

| Action | File |
|--------|------|
| Create | `supabase/migrations/0002_add_session_agenda.sql` |
| Modify | `src/lib/validations/session.ts` |
| Modify | `src/app/api/admin/sessions/route.ts` |
| Modify | `src/app/api/admin/sessions/[id]/route.ts` |
| Modify | `src/components/admin/SessionForm.tsx` |
| Modify | `src/app/admin/(protected)/sessions/[id]/page.tsx` |

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/0002_add_session_agenda.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/0002_add_session_agenda.sql
CREATE TABLE public.session_agenda (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_agenda_session_id ON public.session_agenda(session_id);
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: migration runs without error.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_add_session_agenda.sql
git commit -m "feat: add session_agenda table"
```

---

## Task 2: Zod validation

**Files:**
- Modify: `src/lib/validations/session.ts`

- [ ] **Step 1: Add agenda field to both schemas**

Replace the full file content:

```ts
import { z } from "zod";

const AgendaItemSchema = z.object({
  title: z.string().min(1).max(200),
});

export const CreateSessionSchema = z.object({
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().max(200).optional(),
  status: z.enum(["draft", "active", "completed", "cancelled"]).default("draft"),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  notes: z.string().optional(),
  programme_ids: z.array(z.string().uuid()).min(1),
  agenda: z.array(AgendaItemSchema).optional(),
});

export const UpdateSessionSchema = CreateSessionSchema.partial().extend({
  status: z.enum(["draft", "active", "completed", "cancelled"]).optional(),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;
export type UpdateSessionInput = z.infer<typeof UpdateSessionSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/validations/session.ts
git commit -m "feat: add agenda field to session validation schemas"
```

---

## Task 3: POST route — save agenda on create

**Files:**
- Modify: `src/app/api/admin/sessions/route.ts`

- [ ] **Step 1: Destructure agenda from body and insert after session**

In the POST handler, replace:

```ts
const { session_date, title, start_time, end_time, notes, programme_ids = [] } = body;
```

with:

```ts
const { session_date, title, start_time, end_time, notes, programme_ids = [], agenda = [] } = body;
```

Then after the `session_programmes` insert block (after line 85), add:

```ts
  // Insert session_agenda
  if (agenda.length > 0) {
    const agendaRows = agenda.map((item: { title: string }, i: number) => ({
      session_id: newSession.id,
      title: item.title,
      sort_order: i,
    }));
    await serviceClient.from("session_agenda").insert(agendaRows);
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/sessions/route.ts
git commit -m "feat: persist agenda items on session create"
```

---

## Task 4: GET [id] — include agenda in response

**Files:**
- Modify: `src/app/api/admin/sessions/[id]/route.ts`

- [ ] **Step 1: Add session_agenda to the select query**

In the GET handler, replace:

```ts
    .select(
      `
      *,
      session_programmes(programme_id, programmes(id, name, colour))
      `
    )
```

with:

```ts
    .select(
      `
      *,
      session_programmes(programme_id, programmes(id, name, colour)),
      session_agenda(id, title, sort_order)
      `
    )
```

- [ ] **Step 2: Sort agenda before returning**

Replace:

```ts
  return NextResponse.json({ session, attendance_count: attendanceCount ?? 0 });
```

with:

```ts
  const sessionWithSortedAgenda = {
    ...session,
    session_agenda: (session.session_agenda ?? []).sort(
      (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
    ),
  };
  return NextResponse.json({ session: sessionWithSortedAgenda, attendance_count: attendanceCount ?? 0 });
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/sessions/[id]/route.ts
git commit -m "feat: include sorted agenda in session GET response"
```

---

## Task 5: PATCH [id] — sync agenda on update

**Files:**
- Modify: `src/app/api/admin/sessions/[id]/route.ts`

- [ ] **Step 1: Extract agenda from body and sync**

In the PATCH handler, replace:

```ts
  const body = await request.json();
  const { programme_ids, ...fields } = body;
```

with:

```ts
  const body = await request.json();
  const { programme_ids, agenda, ...fields } = body;
```

After the `session_programmes` sync block (after line 77), add:

```ts
  // Sync session_agenda if provided
  if (Array.isArray(agenda)) {
    await serviceClient.from("session_agenda").delete().eq("session_id", id);
    if (agenda.length > 0) {
      const agendaRows = agenda.map((item: { title: string }, i: number) => ({
        session_id: id,
        title: item.title,
        sort_order: i,
      }));
      await serviceClient.from("session_agenda").insert(agendaRows);
    }
  }
```

- [ ] **Step 2: Also include agenda in the PATCH response select**

Replace:

```ts
  const { data: updatedSession } = await serviceClient
    .from("sessions")
    .select("*, session_programmes(programme_id, programmes(id, name, colour))")
    .eq("id", id)
    .single();

  return NextResponse.json({ session: updatedSession });
```

with:

```ts
  const { data: updatedSession } = await serviceClient
    .from("sessions")
    .select("*, session_programmes(programme_id, programmes(id, name, colour)), session_agenda(id, title, sort_order)")
    .eq("id", id)
    .single();

  return NextResponse.json({ session: updatedSession });
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/sessions/[id]/route.ts
git commit -m "feat: sync agenda items on session PATCH"
```

---

## Task 6: Install dnd-kit

- [ ] **Step 1: Install packages**

```bash
cd "D:\Works\Neu Entity\Muttaqin Attendance App\santunan-emas"
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: packages added to package.json, no peer dep errors.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add @dnd-kit packages for drag-to-reorder"
```

---

## Task 7: SessionForm — agenda UI

**Files:**
- Modify: `src/components/admin/SessionForm.tsx`

- [ ] **Step 1: Add agenda to SessionFormData interface and imports**

Replace:

```ts
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
```

with:

```ts
"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
```

- [ ] **Step 2: Update SessionFormData to include agenda**

Replace:

```ts
interface SessionFormData {
  id?: string;
  session_date: string;
  title: string;
  start_time: string;
  end_time: string;
  notes: string;
  programme_ids: string[];
  status?: string;
}
```

with:

```ts
interface AgendaItem {
  _key: string;
  title: string;
}

interface SessionFormData {
  id?: string;
  session_date: string;
  title: string;
  start_time: string;
  end_time: string;
  notes: string;
  programme_ids: string[];
  agenda: AgendaItem[];
  status?: string;
}
```

- [ ] **Step 3: Update SessionFormProps to accept initial agenda**

Replace:

```ts
interface SessionFormProps {
  initialData?: Partial<SessionFormData>;
  onSuccess: () => void;
  onCancel: () => void;
}
```

with:

```ts
interface SessionFormProps {
  initialData?: Partial<Omit<SessionFormData, "agenda">> & {
    agenda?: Array<{ id: string; title: string; sort_order: number }>;
  };
  onSuccess: () => void;
  onCancel: () => void;
}
```

- [ ] **Step 4: Add SortableAgendaItem component above SessionForm**

Add this component above the `export function SessionForm` line:

```ts
function SortableAgendaItem({
  item,
  onChange,
  onRemove,
}: {
  item: AgendaItem;
  onChange: (value: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item._key });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-[#173d35]/30 hover:text-[#173d35]/60 shrink-0"
      >
        <GripVertical className="size-4" />
      </button>
      <Input
        value={item.title}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tajuk aktiviti / Activity title"
        className="flex-1 min-h-[40px] text-sm"
      />
      <button
        type="button"
        onClick={onRemove}
        className="text-[#173d35]/30 hover:text-red-400 shrink-0"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Update form state initializer to include agenda**

Replace:

```ts
  const [form, setForm] = useState<SessionFormData>({
    session_date: initialData?.session_date ?? "",
    title: initialData?.title ?? "",
    start_time: initialData?.start_time ?? "",
    end_time: initialData?.end_time ?? "",
    notes: initialData?.notes ?? "",
    programme_ids: initialData?.programme_ids ?? [],
  });
```

with:

```ts
  const sensors = useSensors(useSensor(PointerSensor));

  const [form, setForm] = useState<SessionFormData>({
    session_date: initialData?.session_date ?? "",
    title: initialData?.title ?? "",
    start_time: initialData?.start_time ?? "",
    end_time: initialData?.end_time ?? "",
    notes: initialData?.notes ?? "",
    programme_ids: initialData?.programme_ids ?? [],
    agenda: (initialData?.agenda ?? []).map((item) => ({
      _key: item.id,
      title: item.title,
    })),
  });
```

- [ ] **Step 6: Add agenda helper functions**

Add these three functions after `toggleProgramme`:

```ts
  function addAgendaItem() {
    setForm((prev) => ({
      ...prev,
      agenda: [...prev.agenda, { _key: crypto.randomUUID(), title: "" }],
    }));
  }

  function updateAgendaItem(key: string, value: string) {
    setForm((prev) => ({
      ...prev,
      agenda: prev.agenda.map((item) =>
        item._key === key ? { ...item, title: value } : item
      ),
    }));
  }

  function removeAgendaItem(key: string) {
    setForm((prev) => ({
      ...prev,
      agenda: prev.agenda.filter((item) => item._key !== key),
    }));
  }

  function handleAgendaDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setForm((prev) => {
        const oldIndex = prev.agenda.findIndex((i) => i._key === active.id);
        const newIndex = prev.agenda.findIndex((i) => i._key === over.id);
        return { ...prev, agenda: arrayMove(prev.agenda, oldIndex, newIndex) };
      });
    }
  }
```

- [ ] **Step 7: Include agenda in the submit body**

Replace:

```ts
      body: JSON.stringify(form),
```

with:

```ts
      body: JSON.stringify({
        ...form,
        agenda: form.agenda.map(({ title }) => ({ title })),
      }),
```

- [ ] **Step 8: Add the agenda section to the JSX**

Add this block between the closing `</div>` of the Notes section and the `{error && ...}` block:

```tsx
      {/* Agenda */}
      <div className="space-y-2">
        <Label>
          <span className="font-bold text-[#173d35]">Aturcara</span>
          <span className="block text-xs text-[#173d35]/60">Agenda / Rundown (optional)</span>
        </Label>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleAgendaDragEnd}>
          <SortableContext items={form.agenda.map((i) => i._key)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {form.agenda.map((item) => (
                <SortableAgendaItem
                  key={item._key}
                  item={item}
                  onChange={(value) => updateAgendaItem(item._key, value)}
                  onRemove={() => removeAgendaItem(item._key)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <button
          type="button"
          onClick={addAgendaItem}
          className="flex items-center gap-1.5 text-sm text-[#173d35]/60 hover:text-[#173d35] transition-colors"
        >
          <Plus className="size-3.5" />
          <span>Tambah Item / Add Item</span>
        </button>
      </div>
```

- [ ] **Step 9: Verify the form renders and drag works**

Run `npm run dev`, open any session edit dialog, confirm:
- Agenda section appears below Notes
- "Add Item" adds a row
- Dragging reorders rows
- Deleting a row removes it
- Saving persists the agenda (check Supabase table or GET response)

- [ ] **Step 10: Commit**

```bash
git add src/components/admin/SessionForm.tsx
git commit -m "feat: add drag-to-reorder agenda UI to SessionForm"
```

---

## Task 8: Session detail page — display agenda

**Files:**
- Modify: `src/app/admin/(protected)/sessions/[id]/page.tsx`

- [ ] **Step 1: Add session_agenda to the SessionDetail interface**

Replace:

```ts
interface SessionDetail {
  id: string;
  session_date: string;
  title: string | null;
  status: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  session_programmes: Array<{
    programme_id: string;
    programmes: { id: string; name: string; colour: string } | null;
  }>;
}
```

with:

```ts
interface SessionDetail {
  id: string;
  session_date: string;
  title: string | null;
  status: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  session_programmes: Array<{
    programme_id: string;
    programmes: { id: string; name: string; colour: string } | null;
  }>;
  session_agenda: Array<{ id: string; title: string; sort_order: number }>;
}
```

- [ ] **Step 2: Render the agenda section**

Add this block after the closing `</div>` of the Session Info Card (after line 151, before the Attendance List section):

```tsx
      {/* Agenda */}
      {session.session_agenda?.length > 0 && (
        <div className="bg-white rounded-[1.5rem] shadow-ambient p-6 mb-6">
          <div className="mb-4">
            <h2 className="font-bold text-[#173d35]">Aturcara</h2>
            <p className="text-xs text-[#173d35]/60">Agenda</p>
          </div>
          <ol className="space-y-2">
            {session.session_agenda.map((item, i) => (
              <li key={item.id} className="flex items-start gap-3 text-sm text-[#173d35]">
                <span className="font-bold text-[#173d35]/40 w-5 shrink-0 text-right">{i + 1}.</span>
                <span>{item.title}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
```

- [ ] **Step 3: Update SessionRow interface in the sessions list page to include agenda**

In `src/app/admin/(protected)/sessions/page.tsx`, update `SessionRow`:

```ts
interface SessionRow {
  id: string;
  session_date: string;
  title: string | null;
  status: string;
  session_programmes: Array<{
    programme_id: string;
    programmes: { name: string; colour: string } | null;
  }>;
  session_agenda: Array<{ id: string; title: string; sort_order: number }>;
}
```

- [ ] **Step 4: Include session_agenda in the list GET query**

In `src/app/api/admin/sessions/route.ts`, update the select string to add `session_agenda(id, title, sort_order)`:

```ts
  let query = serviceClient
    .from("sessions")
    .select(
      `
      id,
      session_date,
      title,
      status,
      start_time,
      end_time,
      notes,
      created_at,
      session_programmes(programme_id, programmes(name, colour)),
      session_agenda(id, title, sort_order)
      `,
      { count: "exact" }
    )
    .order("session_date", { ascending: false })
    .range(from, to);
```

- [ ] **Step 5: Pass agenda to SessionForm in the edit dialog**

In `src/app/admin/(protected)/sessions/page.tsx`, update the `SessionForm` `initialData` prop:

```tsx
          <SessionForm
            initialData={editSession ? {
              id: editSession.id,
              session_date: editSession.session_date,
              title: editSession.title ?? "",
              programme_ids: editSession.session_programmes?.map((sp) => sp.programme_id) ?? [],
              agenda: (editSession.session_agenda ?? []).sort((a, b) => a.sort_order - b.sort_order),
            } : undefined}
            onSuccess={() => { setShowForm(false); fetchSessions(); }}
            onCancel={() => setShowForm(false)}
          />
```

- [ ] **Step 6: Commit sessions list page changes**

```bash
git add src/app/admin/(protected)/sessions/page.tsx src/app/api/admin/sessions/route.ts
git commit -m "feat: include agenda in session list and pass to edit form"
```

- [ ] **Step 4: Verify the agenda section appears on the detail page**

Run `npm run dev`, open a session that has agenda items, confirm the numbered list renders correctly. Confirm sessions with no agenda items show no section.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/(protected)/sessions/[id]/page.tsx
git commit -m "feat: display agenda on session detail page"
```
