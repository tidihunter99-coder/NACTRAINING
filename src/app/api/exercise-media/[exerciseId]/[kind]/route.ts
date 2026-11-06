import { NextResponse } from "next/server";
import { getVerifiedProfile } from "@/lib/auth/guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { exerciseMediaBucket, exerciseMediaFields, privateMediaPath, type ExerciseMediaKind } from "@/lib/exercise-media";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex", Vary: "Cookie" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const signedUrlSeconds = 60;

export async function GET(_: Request, { params }: { params: Promise<{ exerciseId: string; kind: string }> }) {
  const { exerciseId, kind } = await params;
  if (!uuid.test(exerciseId) || !(kind in exerciseMediaFields)) return new NextResponse(null, { status: 404, headers: noStore });
  const field = exerciseMediaFields[kind as ExerciseMediaKind];
  const auth = await getVerifiedProfile();
  if (auth.state !== "ok" || !auth.profile) return new NextResponse(null, { status: 401, headers: noStore });
  const db = await createSupabaseServerClient();
  if (!db) return new NextResponse(null, { status: 503, headers: noStore });
  const result = await db.from("exercises").select("id,is_active,visual_review_status,image_url,video_url,anatomy_image_url").eq("id", exerciseId).maybeSingle();
  if (result.error || !result.data) return new NextResponse(null, { status: 404, headers: noStore });
  if (auth.profile.role !== "admin" && (!result.data.is_active || result.data.visual_review_status !== "approved")) return new NextResponse(null, { status: 404, headers: noStore });
  const permitted = await db.rpc("can_access_exercise_media", { target_exercise_id: exerciseId });
  if (permitted.error || !permitted.data) return new NextResponse(null, { status: 404, headers: noStore });
  const path = privateMediaPath(result.data[field] as string | null, exerciseId, kind as ExerciseMediaKind);
  if (!path) return new NextResponse(null, { status: 404, headers: noStore });
  // This client carries the caller's JWT, so Storage RLS repeats the role and
  // exercise authorization before a signed URL can be minted.
  const signed = await db.storage.from(exerciseMediaBucket).createSignedUrl(path, signedUrlSeconds);
  if (signed.error || !signed.data?.signedUrl) return new NextResponse(null, { status: 404, headers: noStore });
  const response = NextResponse.redirect(signed.data.signedUrl, 307);
  Object.entries(noStore).forEach(([name, value]) => response.headers.set(name, value));
  return response;
}
