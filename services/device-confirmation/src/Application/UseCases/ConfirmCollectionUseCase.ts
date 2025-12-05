import { IConfirmationActionRepository } from "../Interfaces/IConfirmationActionRepository";
import { ConfirmCollectionDTO } from "../Dtos/ConfirmCollectionDTO";
import { ConfirmationAction } from "../../Domain/Entities/ConfirmationAction";
import { ConfirmationActionType } from "../../Domain/Enums/ConfirmationActionType";
import { ConfirmationEventPublisher } from "../../Infrastructure/EventGrid/ConfirmationEventPublisher";
import { randomUUID } from "crypto";

export class ConfirmCollectionUseCase {
  constructor(
    private readonly repository: IConfirmationActionRepository,
    private readonly publisher: ConfirmationEventPublisher
  ) {}

  async execute(data: ConfirmCollectionDTO): Promise<ConfirmationAction> {
    const { staffId, reservationId, deviceId, notes } = data;

    if (!staffId || !reservationId || !deviceId) {
      throw new Error("staffId, reservationId, and deviceId are required.");
    }

    const action: ConfirmationAction = {
      id: randomUUID(),
      staffId,
      reservationId,
      deviceId,
      actionType: ConfirmationActionType.Collected,
      timestamp: new Date().toISOString(),
      notes
    };

    const saved = await this.repository.create(action);

    await this.publisher.publish({
      eventType: "Confirmation.Collected",
      data: saved
    });

    return saved;
  }
}
