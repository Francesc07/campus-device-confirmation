import {
  EventGridPublisherClient,
  AzureKeyCredential,
  EventGridEvent
} from "@azure/eventgrid";
import { InvocationContext } from "@azure/functions";
import { randomUUID } from "crypto";
import { ConfirmationAction } from "../../Domain/Entities/ConfirmationAction";

export class ConfirmationEventPublisher {
  private client: EventGridPublisherClient<any>;

  constructor(endpoint: string, key: string) {
    this.client = new EventGridPublisherClient<any>(
      endpoint,
      "EventGrid",
      new AzureKeyCredential(key)
    );
  }

  async publish(event: { eventType: string; data: ConfirmationAction }, ctx?: InvocationContext): Promise<void> {
    const gridEvent: EventGridEvent<ConfirmationAction> = {
      id: randomUUID(),
      eventType: event.eventType,
      subject: `confirmation/${event.data.reservationId}`,
      eventTime: new Date(),
      data: event.data,
      dataVersion: "1.0"
    };

    ctx?.log("📡 Sending event to Event Grid", { 
      eventType: event.eventType, 
      subject: gridEvent.subject,
      eventId: gridEvent.id 
    });

    try {
      await this.client.send([gridEvent]);
      ctx?.log("✅ Event sent to Event Grid successfully");
    } catch (error: any) {
      ctx?.log("❌ Failed to send event to Event Grid", error);
      throw error;
    }
  }
}
