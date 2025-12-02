import { app, HttpRequest, HttpResponseInit } from "@azure/functions";
import { appServices } from "../../appServices";

export async function confirmReturnHttp(req: HttpRequest): Promise<HttpResponseInit> {
  try {
    const body = (await req.json()) as any;
    const { staffId, reservationId, deviceId, notes } = body;

    if (!staffId || !reservationId || !deviceId) {
      return { status: 400, jsonBody: { error: "staffId, reservationId, and deviceId are required" } };
    }

    const result = await appServices.confirmReturnHandler.execute(
      staffId,
      reservationId,
      deviceId,
      notes
    );

    return { status: 200, jsonBody: result };
  } catch (err: any) {
    return { status: 500, jsonBody: { error: err.message } };
  }
}

app.http("confirm-return-http", {
  methods: ["POST"],
  route: "devicereturn/confirm",
  authLevel: "anonymous",
  handler: confirmReturnHttp,
});

