import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { appServices } from "../../appServices";

export async function listPendingLoansHttp(
  req: HttpRequest,
  ctx: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const type = req.query.get("type") || "collection"; // "collection" or "return"
    
    let loans;
    if (type === "return") {
      loans = await appServices.snapshotRepo.listPendingReturns();
      ctx.log("📋 Listed pending returns", { count: loans.length });
    } else {
      loans = await appServices.snapshotRepo.listPendingCollections();
      ctx.log("📋 Listed pending collections", { count: loans.length });
    }

    return {
      status: 200,
      jsonBody: {
        type,
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
