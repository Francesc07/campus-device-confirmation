// src/API/functions/confirm-return-http.ts
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { StaffService } from "../../Application/StaffService";
import { CosmosStaffActionRepository } from "../../Infrastructure/CosmosStaffActionRepository";

export async function confirmReturn(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  try {
    const { staffId, reservationId, notes } = await req.json() as { staffId: string; reservationId: string; notes?: string };
    if (!staffId || !reservationId)
      return { status: 400, jsonBody: { error: "Missing staffId or reservationId" } };

    const service = new StaffService(new CosmosStaffActionRepository());
    const action = await service.confirmReturn(staffId, reservationId, notes);

    ctx.log(`Return confirmed by staff ${staffId} for reservation ${reservationId}`);

    // 🔸 Future: emit "ReturnConfirmed" event to Reservation & Catalog services
    return { status: 200, jsonBody: { message: "Return confirmed", action } };
  } catch (e:any) {
    ctx.error(e.message);
    return { status: 500, jsonBody: { error: "Internal Server Error" } };
  }
}

app.http("confirm-return-http", {
  methods: ["POST"],
  route: "staff/confirm-return",
  authLevel: "anonymous",
  handler: confirmReturn
});
