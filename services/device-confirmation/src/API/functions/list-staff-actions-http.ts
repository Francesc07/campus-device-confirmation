import { app, HttpRequest, HttpResponseInit } from "@azure/functions";
import { appServices } from "../../appServices";

export async function listStaffActionsHttp(req: HttpRequest): Promise<HttpResponseInit> {
  try {
    const staffId = req.query.get("staffId") || undefined;
    const reservationId = req.query.get("reservationId") || undefined;

    const filter = { staffId, reservationId };

    const result = await appServices.listStaffActionsHandler.execute(filter);

    return { status: 200, jsonBody: result };
  } catch (err: any) {
    return { status: 500, jsonBody: { error: err.message } };
  }
}

app.http("list-staff-actions-http", {
  methods: ["GET"],
  route: "confirmation/actions",
  authLevel: "anonymous",
  handler: listStaffActionsHttp,
});

