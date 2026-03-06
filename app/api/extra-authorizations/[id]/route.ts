import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { authorizeExtraOrder } from "@/services/authorization.service";
import { ROLES } from "@/lib/db/schema";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    if (session.user.role < ROLES.ADMIN) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    try {
        const updated = await authorizeExtraOrder(id, session.user.id, body.approve);
        return NextResponse.json(updated);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
