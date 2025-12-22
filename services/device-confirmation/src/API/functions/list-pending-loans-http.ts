import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { appServices } from "../../appServices";
import { requireAuth } from "../../Infrastructure/Auth/auth0Validation";

export async function listPendingLoansHttp(
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
    const status = req.query.get("status") || "pending-collection";
    
    let loans;
    switch (status) {
      case "pending-collection":
        loans = await appServices.snapshotRepo.listPendingCollections();
        ctx.log("📋 Listed pending collections", { count: loans.length });
        break;
      
      case "collected":
        loans = await appServices.snapshotRepo.listCollected();
        ctx.log("📋 Listed collected devices", { count: loans.length });
        break;
      
      case "pending-return":
        loans = await appServices.snapshotRepo.listPendingReturns();
        ctx.log("📋 Listed pending returns", { count: loans.length });
        break;
      
      case "returned":
        loans = await appServices.snapshotRepo.listReturned();
        ctx.log("📋 Listed returned devices", { count: loans.length });
        break;
      
      case "all":
        loans = await appServices.snapshotRepo.listAll();
        ctx.log("📋 Listed all loans", { count: loans.length });
        break;
      
      default:
        loans = await appServices.snapshotRepo.listPendingCollections();
        ctx.log("📋 Listed pending collections (default)", { count: loans.length });
        break;
    }

    return {
      status: 200,
      jsonBody: {
        status,
        loans,
        count: loans.length
      }
    };
  } catch (err: any) {
    ctx.log("❌ Error in listPendingLoansHttp", err);
    return {
      status: 500,
      jsonBody: { error: err.message ?? "Internal server error" }
    };
  }
}

app.http("list-pending-loans-http", {
  methods: ["GET"],
  route: "staff/pending-loans",
  authLevel: "anonymous",
  handler: listPendingLoansHttp
});
