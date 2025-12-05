import { InvocationContext } from "@azure/functions";
import { IConfirmationActionRepository } from "../Interfaces/IConfirmationActionRepository";
import { IReservationSnapshotRepository } from "../Interfaces/IReservationSnapshotRepository";
import { ConfirmReturnDTO } from "../Dtos/ConfirmReturnDTO";
import { ConfirmationAction } from "../../Domain/Entities/ConfirmationAction";
import { ConfirmationActionType } from "../../Domain/Enums/ConfirmationActionType";
import { ConfirmationEventPublisher } from "../../Infrastructure/EventGrid/ConfirmationEventPublisher";
import { randomUUID } from "crypto";

export class ConfirmReturnUseCase {
  constructor(
    private readonly repository: IConfirmationActionRepository,
    private readonly publisher: ConfirmationEventPublisher,
    private readonly snapshotRepo: IReservationSnapshotRepository
  ) {}

  async execute(data: ConfirmReturnDTO, ctx?: InvocationContext): Promise<ConfirmationAction> {
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

    // Update snapshot status to Returned (loan completed)
    await this.snapshotRepo.updateStatus(reservationId, "Returned");

    ctx?.log("📤 Publishing Confirmation.Returned event", { reservationId, deviceId });
    await this.publisher.publish({
      eventType: "Confirmation.Returned",
      data: saved
    }, ctx);
    ctx?.log("✅ Confirmation.Returned event published successfully");

    return saved;
  }
}
