import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { appServices } from "../../appServices";

export async function listConfirmationActionsHttp(
  req: HttpRequest,
  ctx: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const staffId = req.query.get("staffId") || undefined;
    const reservationId = req.query.get("reservationId") || undefined;

    const filter = { staffId, reservationId };

    const result = await appServices.listConfirmationActionsHandler.execute(filter);

    ctx.log("📄 Listing confirmation actions", filter);

    return {
      status: 200,
      jsonBody: result
    };
  } catch (err: any) {
    ctx.log("❌ Error in listConfirmationActionsHttp", err);
    return {
      status: 500,
      jsonBody: { error: err.message ?? "Internal server error" }
    };
  }
}

app.http("list-confirmation-actions-http", {
  methods: ["GET"],
  route: "confirmation/actions",
  authLevel: "anonymous",
  handler: listConfirmationActionsHttp
});
