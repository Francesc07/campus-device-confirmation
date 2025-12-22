import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

/**
 * Health Check Endpoint
 * Simple endpoint to verify service is running
 */
export async function healthCheckHttp(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log("Health check requested");

  return {
    status: 200,
    jsonBody: {
      status: "healthy",
      service: "device-confirmation",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    },
    headers: {
      "Content-Type": "application/json",
    },
  };
}

app.http("health-check-http", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health",
  handler: healthCheckHttp,
});
