import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

/**
 * Supabase throws a PostgrestError (message/details/hint/code); anything else
 * reaching the handler is an ordinary Error or a non-Error throw. Empty strings
 * fall through to the next fallback, matching the original `||` chain.
 */
function toErrorBody(error: unknown) {
  const fields: Record<string, unknown> =
    typeof error === "object" && error !== null
      ? (error as Record<string, unknown>)
      : {};
  const str = (value: unknown) =>
    typeof value === "string" && value.length > 0 ? value : null;

  return {
    error: str(fields.message) ?? "Failed to perform bulk action",
    details: str(fields.details) ?? str(fields.hint),
    code: str(fields.code),
  };
}

export async function POST(request: Request) {
  try {
    const { ids, action } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "No participant IDs provided" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let result;

    if (action === "delete") {
      // 1. Delete associated records first to avoid FK constraint violations
      // Clear attendance
      const { error: attendanceError } = await serviceClient
        .from("attendance")
        .delete()
        .in("participant_id", ids);
        
      if (attendanceError) {
        throw attendanceError;
      }

      // 2. Hard delete participants from database
      result = await serviceClient
        .from("participants")
        .delete()
        .in("id", ids);
    } else if (action === "deactivate") {
      result = await serviceClient
        .from("participants")
        .update({ is_active: false })
        .in("id", ids);
    } else if (action === "activate") {
      result = await serviceClient
        .from("participants")
        .update({ is_active: true })
        .in("id", ids);
    } else {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    if (result.error) {
      throw result.error;
    }

    return NextResponse.json({
      message: `Successfully ${action}d ${ids.length} participants`,
      count: ids.length,
    });
  } catch (error: unknown) {
    console.error("Bulk action error:", error);
    return NextResponse.json(toErrorBody(error), { status: 500 });
  }
}
