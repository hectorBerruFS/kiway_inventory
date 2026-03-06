import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requestExtraOrder, getPendingAuthorizations } from "@/services/authorization.service";
import { ROLES } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // Solo admins pueden ver solicitudes pendientes globales
    if (session.user.role < ROLES.ADMIN) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    try {
        const pending = await getPendingAuthorizations();
        return NextResponse.json(pending);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();

    try {
        const authorization = await requestExtraOrder(
            body.companyId,
            session.user.id,
            body.month,
            body.reason
        );
        return NextResponse.json(authorization);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
