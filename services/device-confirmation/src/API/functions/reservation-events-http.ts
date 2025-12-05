import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { tryHandleEventGridValidation } from "./shared/handleEventGridValidation"; 
import { appServices } from "../../appServices";
import { ReservationSnapshot } from "../../Domain/Entities/ReservationSnapshot";

export async function reservationEventsHttp(
  req: HttpRequest,
  ctx: InvocationContext
): Promise<HttpResponseInit> {
  const events = (await req.json()) as any[];

  // 1️⃣ Handle Event Grid Subscription Validation
  const validation = tryHandleEventGridValidation(events, ctx);
  if (validation) {
    return validation;
  }

  // 2️⃣ Process actual business events
  for (const evt of events) {
    const eventType = evt.eventType || evt.type;
    const data = evt.data;

    switch (eventType) {
      case "Reservation.Confirmed":
        ctx.log("📩 Reservation.Confirmed received in Confirmation Service", data);
        
        // Save reservation snapshot for staff to see in their dashboard
        const snapshot: ReservationSnapshot = {
          reservationId: data.reservationId,
          deviceId: data.deviceId,
          userId: data.userId,
          startDate: data.startDate,
          dueDate: data.dueDate,
          status: "PendingCollection",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await appServices.snapshotRepo.save(snapshot);
        ctx.log("✅ Saved reservation snapshot for staff dashboard", { reservationId: data.reservationId });
        break;

      case "Reservation.Cancelled":
        ctx.log("📩 Reservation.Cancelled received in Confirmation Service", data);
        // Update status or delete the snapshot
        const existing = await appServices.snapshotRepo.getByReservationId(data.reservationId);
        if (existing) {
          await appServices.snapshotRepo.updateStatus(data.reservationId, "Returned");
          ctx.log("✅ Updated cancelled reservation status", { reservationId: data.reservationId });
        }
        break;

      default:
        ctx.log(`ℹ️ Ignoring unsupported eventType in Confirmation Service: ${eventType}`);
        break;
    }
  }

  return { status: 200 };
}

app.http("reservation-events-http", {
  methods: ["POST"],
  route: "events/reservations",
  authLevel: "anonymous",
  handler: reservationEventsHttp
});
