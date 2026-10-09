import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });
  const photo = await db.user.findUnique({
    where: { id: user.id },
    select: { avatar: true, avatarType: true },
  });
  if (!photo?.avatar || !photo.avatarType)
    return new Response(null, { status: 404 });
  return new Response(new Uint8Array(photo.avatar), {
    headers: {
      'Content-Type': photo.avatarType,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  });
}
