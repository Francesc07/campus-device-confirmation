import { HttpResponseInit, InvocationContext } from "@azure/functions";

/**
 * Handles Event Grid validation handshake.
 */
export function tryHandleEventGridValidation(
  events: any[],
  ctx: InvocationContext
): HttpResponseInit | null {

  if (!Array.isArray(events)) return null;

  for (const evt of events) {
    const type = evt.eventType || evt.type;
    const data = evt.data || evt?.data?.data;

    if (type === "Microsoft.EventGrid.SubscriptionValidationEvent") {
      const code = data?.validationCode;

      ctx.log("🟡 EventGrid validation event detected", { code });

      return {
        status: 200,
        jsonBody: { validationResponse: code }
      };
    }
  }

  return null;
}
