import { IConfirmationActionRepository } from "../Interfaces/IConfirmationActionRepository";
import { ConfirmReturnDTO } from "../Dtos/ConfirmReturnDTO";
import { ConfirmationAction } from "../../Domain/Entities/ConfirmationAction";
import { ConfirmationActionType } from "../../Domain/Enums/ConfirmationActionType";
import { ConfirmationEventPublisher } from "../../Infrastructure/EventGrid/ConfirmationEventPublisher";
import { randomUUID } from "crypto";

export class ConfirmReturnUseCase {
  constructor(
    private readonly repository: IConfirmationActionRepository,
    private readonly publisher: ConfirmationEventPublisher
  ) {}

  async execute(data: ConfirmReturnDTO): Promise<ConfirmationAction> {
    const { staffId, reservationId, deviceId, notes } = data;

    if (!staffId || !reservationId || !deviceId) {
      throw new Error("staffId, reservationId, and deviceId are required.");
    }

    const action: ConfirmationAction = {
      id: randomUUID(),
      staffId,
      reservationId,
      deviceId,
      actionType: ConfirmationActionType.Returned,
      timestamp: new Date().toISOString(),
      notes
    };

    const saved = await this.repository.create(action);

    await this.publisher.publish({
      eventType: "Confirmation.Returned",
      data: saved
    });

    return saved;
  }
}
