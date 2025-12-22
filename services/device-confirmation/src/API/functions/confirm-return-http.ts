import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { appServices } from "../../appServices";
import { requireAuth } from "../../Infrastructure/Auth/auth0Validation";

export async function confirmReturnHttp(
  req: HttpRequest,
  ctx: InvocationContext
): Promise<HttpResponseInit> {
  // 🔐 Authenticate and authorize staff member
  const authResult = await requireAuth(req, ctx, ["staff:confirm"]);
  if ("status" in authResult && typeof authResult.status === "number") {
    return authResult as HttpResponseInit; // Return 401/403 response
  }
  
  const authenticatedUser = authResult as import("../../Infrastructure/Auth/auth0Validation").AuthenticatedUser;
  ctx.log("🔐 Authenticated staff", { sub: authenticatedUser.sub, permissions: authenticatedUser.permissions });

  try {
    const body = (await req.json()) as any;
    const { reservationId, deviceId, notes } = body;

    // Use authenticated user's ID as staffId
    const staffId = authenticatedUser.sub!;

    if (!reservationId || !deviceId) {
      return {
        status: 400,
        jsonBody: {
          error: "reservationId and deviceId are required."
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
