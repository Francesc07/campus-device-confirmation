// src/API/functions/confirm-collection-http.ts
import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { StaffService } from "../../Application/StaffService";
import { CosmosStaffActionRepository } from "../../Infrastructure/CosmosStaffActionRepository";

export async function confirmCollection(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  try {
    const body = await req.json() as { staffId?: string, reservationId?: string, notes?: string };
    const { staffId, reservationId, notes } = body || {};
    if (!staffId || !reservationId)
      return { status: 400, jsonBody: { error: "Missing staffId or reservationId" } };

    const service = new StaffService(new CosmosStaffActionRepository());
    const action = await service.confirmCollection(staffId, reservationId, notes);

    ctx.log(`Collection confirmed by staff ${staffId} for reservation ${reservationId}`);

    // 🔸 Future: emit "CollectionConfirmed" event to Reservation Service
    return { status: 200, jsonBody: { message: "Collection confirmed", action } };
  } catch (e:any) {
    ctx.error(e.message);
    return { status: 500, jsonBody: { error: "Internal Server Error" } };
  }
}

app.http("confirm-collection-http", {
  methods: ["POST"],
  route: "staff/confirm-collection",
  authLevel: "anonymous",
  handler: confirmCollection
});
