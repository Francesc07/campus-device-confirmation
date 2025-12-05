import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { appServices } from "../../appServices";

export async function confirmReturnHttp(
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

    const result = await appServices.confirmReturnHandler.execute(
      staffId,
      reservationId,
      deviceId,
      notes,
      ctx
    );

    ctx.log("✅ Return confirmed", { staffId, reservationId, deviceId });

    return {
      status: 200,
      jsonBody: result
    };
  } catch (err: any) {
    ctx.log("❌ Error in confirmReturnHttp", err);
    return {
      status: 500,
      jsonBody: { error: err.message ?? "Internal server error" }
    };
  }
}

app.http("confirm-return-http", {
  methods: ["POST"],
  route: "confirmation/return/confirm",
  authLevel: "anonymous",
  handler: confirmReturnHttp
});
