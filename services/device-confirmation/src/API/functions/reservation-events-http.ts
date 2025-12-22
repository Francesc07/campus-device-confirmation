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
        
        // IDEMPOTENCY: Check if snapshot already exists
        const existingSnapshot = await appServices.snapshotRepo.getByReservationId(data.reservationId);
        if (existingSnapshot) {
          ctx.log("⚠️ Reservation snapshot already exists (idempotent)", { reservationId: data.reservationId, status: existingSnapshot.status });
          break;
        }
        
        // Save reservation snapshot for staff to see in their dashboard
        const snapshot: ReservationSnapshot = {
          reservationId: data.reservationId,
          deviceId: data.deviceId,
          userId: data.userId,
          // Extract device metadata from loan event
          deviceBrand: data.device?.brand || data.deviceBrand,
          deviceModel: data.device?.model || data.deviceModel,
          // Extract user metadata from loan event
          userEmail: data.user?.email || data.userEmail,
          startDate: data.startDate,
          dueDate: data.dueDate,
          status: "PendingCollection",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await appServices.snapshotRepo.save(snapshot);
        ctx.log("✅ Saved reservation snapshot for staff dashboard", { 
          reservationId: data.reservationId,
          deviceBrand: snapshot.deviceBrand,
          deviceModel: snapshot.deviceModel,
          userEmail: snapshot.userEmail
        });
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

      case "Loan.Created":
        ctx.log("📩 Loan.Created received - treating as Reservation.Confirmed", data);
        
        // IDEMPOTENCY: Check if snapshot already exists
        const existingLoan = await appServices.snapshotRepo.getByReservationId(data.reservationId || data.loanId);
        if (existingLoan) {
          ctx.log("⚠️ Loan snapshot already exists (idempotent)", { loanId: data.reservationId || data.loanId });
          break;
        }
        
        // Save loan snapshot with full metadata
        const loanSnapshot: ReservationSnapshot = {
          reservationId: data.reservationId || data.loanId,
          deviceId: data.deviceId,
          userId: data.userId,
          // Extract device metadata
          deviceBrand: data.device?.brand || data.deviceBrand,
          deviceModel: data.device?.model || data.deviceModel,
          // Extract user metadata
          userEmail: data.user?.email || data.userEmail,
          startDate: data.startDate || data.loanDate,
          dueDate: data.dueDate || data.returnDate,
          status: "PendingCollection",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await appServices.snapshotRepo.save(loanSnapshot);
        ctx.log("✅ Saved loan snapshot with metadata", { 
          loanId: loanSnapshot.reservationId,
          device: `${loanSnapshot.deviceBrand} ${loanSnapshot.deviceModel}`,
          userEmail: loanSnapshot.userEmail
        });
        break;

      case "Loan.Cancelled":
        ctx.log("📩 Loan.Cancelled received in Confirmation Service", data);
        const cancelledLoan = await appServices.snapshotRepo.getByReservationId(data.reservationId || data.loanId);
        if (cancelledLoan) {
          await appServices.snapshotRepo.updateStatus(data.reservationId || data.loanId, "Returned");
          ctx.log("✅ Updated cancelled loan status", { loanId: data.reservationId || data.loanId });
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
