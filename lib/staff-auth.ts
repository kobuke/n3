import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * スタッフ認証ヘルパー
 *
 * 各スタッフAPIルートで個別に認証チェックを書く代わりに、
 * この関数を呼ぶことで認証の一元管理と DRY な実装を保証する。
 *
 * @returns 認証済みなら null、未認証なら 403 レスポンスを返す
 *
 * @example
 * // APIルートの先頭で：
 * const authError = await requireStaffAuth(req);
 * if (authError) return authError;
 */
export async function requireStaffAuth(
    req: NextRequest
): Promise<NextResponse | null> {
    const staffSecret = req.cookies.get("nanjo_staff_secret")?.value;
    if (!staffSecret || staffSecret !== process.env.STAFF_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return null;
}

/**
 * Server Action / Route Handler でクッキーから直接認証チェックを行う。
 * NextRequest オブジェクトが不要な場合（GET / cookies() API 利用時）に使う。
 *
 * @returns 認証済みなら true、未認証なら false
 */
export async function isStaffAuthenticated(): Promise<boolean> {
    const cookieStore = await cookies();
    const staffSecret = cookieStore.get("nanjo_staff_secret")?.value;
    return staffSecret === process.env.STAFF_SECRET;
}
