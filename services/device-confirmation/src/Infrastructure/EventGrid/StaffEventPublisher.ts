import { EventGridPublisherClient, AzureKeyCredential } from "@azure/eventgrid";
import { StaffAction } from "../../Domain/Entities/StaffAction";

export class EventPublisher {
  private client: EventGridPublisherClient<any>;

  constructor() {
    const endpoint = process.env.EVENTGRID_TOPIC_ENDPOINT;
    const key = process.env.EVENTGRID_TOPIC_KEY;

    if (!endpoint || !key) {
      throw new Error("EVENTGRID_TOPIC_ENDPOINT and EVENTGRID_TOPIC_KEY environment variables are required");
    }

    this.client = new EventGridPublisherClient(
      endpoint,
      "EventGrid",
      new AzureKeyCredential(key)
    );
  }

  async publishStaffEvent(eventType: string, action: StaffAction) {
    await this.client.send([
      {
        id: crypto.randomUUID(),
        eventType,
        subject: `staff/actions/${action.reservationId}`,
        data: action,
        dataVersion: "1.0",
        eventTime: new Date().toISOString(),
      },
    ]);
  }
}
