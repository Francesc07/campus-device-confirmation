import { app, HttpRequest, HttpResponseInit } from "@azure/functions";

export async function reservationEventsHttp(req: HttpRequest): Promise<HttpResponseInit> {
  try {
    const body = (await req.json()) as any;
    const events = Array.isArray(body) ? body : [body];

    for (const evt of events) {
      const { eventType, data } = evt;

      switch (eventType) {
        case "Reservation.Confirmed":
          // 👉 Future: staff dashboard could be updated here.
          break;

        case "Reservation.Cancelled":
          // 👉 Future: staff could be notified to free bookings.
          break;

        default:
          break;
      }
    }

    return { status: 200 };
  } catch (err: any) {
    return { status: 500, jsonBody: { error: err.message } };
  }
}

app.http("reservation-events-http", {
  methods: ["POST"],
  route: "events/reservations",
  authLevel: "anonymous",
  handler: reservationEventsHttp,
});

