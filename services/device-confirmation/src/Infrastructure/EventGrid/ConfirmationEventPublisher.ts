import {
  EventGridPublisherClient,
  AzureKeyCredential,
  CloudEvent
} from "@azure/eventgrid";
import { randomUUID } from "crypto";
import { ConfirmationAction } from "../../Domain/Entities/ConfirmationAction";
import { environment } from "../Config/environment";

export class ConfirmationEventPublisher {
  private client: EventGridPublisherClient<"CloudEvent">;

  constructor() {
    this.client = new EventGridPublisherClient(
      environment.eventGrid.confirmEndpoint,
      "CloudEvent",
      new AzureKeyCredential(environment.eventGrid.confirmKey)
    );
  }

  async publish(event: { eventType: string; data: ConfirmationAction }): Promise<void> {
    const cloudEvent: CloudEvent<ConfirmationAction> = {
      id: randomUUID(),
      type: event.eventType,
      source: "confirmation-service",
      time: new Date(),
      data: event.data
    };

    await this.client.send([cloudEvent]);
  }
}
