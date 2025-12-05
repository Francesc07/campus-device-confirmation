import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { appServices } from "../../appServices";

export async function confirmCollectionHttp(
  req: HttpRequest,
  ctx: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const body = (await req.json()) as any;
    const { staffId, reservationId, deviceId, notes } = body;

    if (!staffId || !reservationId || !deviceId) {
      return {
        status: 400,
        jsonBody: {
          error: "staffId, reservationId, and deviceId are required."
        }
      };
    }

    const result = await appServices.confirmCollectionHandler.execute(
      staffId,
      reservationId,
      deviceId,
      notes,
      ctx
    );

    ctx.log("✅ Collection confirmed", { staffId, reservationId, deviceId });

    return {
      status: 200,
      jsonBody: result
    };
  } catch (err: any) {
    ctx.log("❌ Error in confirmCollectionHttp", err);
    return {
      status: 500,
      jsonBody: { error: err.message ?? "Internal server error" }
    };
  }
}

app.http("confirm-collection-http", {
  methods: ["POST"],
  route: "confirmation/collection/confirm",
  authLevel: "anonymous",
  handler: confirmCollectionHttp
});
