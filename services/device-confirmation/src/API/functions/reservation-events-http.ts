import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { tryHandleEventGridValidation } from "./shared/handleEventGridValidation"; 
// import { appServices } from "../../appServices"; // uncomment if you later want to persist something

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
        // 🔜 In future: persist reservation snapshot for staff dashboard if needed.
        break;

      case "Reservation.Cancelled":
        ctx.log("📩 Reservation.Cancelled received in Confirmation Service", data);
        // 🔜 In future: remove from staff pending list, etc.
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
