import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { appServices } from "../../appServices";
import { requireAuth } from "../../Infrastructure/Auth/auth0Validation";

export async function listConfirmationActionsHttp(
  req: HttpRequest,
  ctx: InvocationContext
): Promise<HttpResponseInit> {
  // 🔐 Authenticate and authorize staff member
  const authResult = await requireAuth(req, ctx, ["loan:devices"]);
  if ("status" in authResult && typeof authResult.status === "number") {
    return authResult as HttpResponseInit; // Return 401/403 response
  }
  
  const authenticatedUser = authResult as import("../../Infrastructure/Auth/auth0Validation").AuthenticatedUser;
  ctx.log("🔐 Authenticated staff", { sub: authenticatedUser.sub, permissions: authenticatedUser.permissions });

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
