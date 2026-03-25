import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";

export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await serviceClient
    .from("programmes")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ programmes: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, description, colour, is_default, sort_order } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // If is_default, unset all other defaults first
  if (is_default) {
    await serviceClient
      .from("programmes")
      .update({ is_default: false })
      .eq("is_default", true);
  }

  const { data, error } = await serviceClient
    .from("programmes")
    .insert({
      name,
      description: description ?? null,
      colour: colour ?? "#173d35",
      is_default: is_default ?? false,
      sort_order: sort_order ?? 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ programme: data }, { status: 201 });
}
