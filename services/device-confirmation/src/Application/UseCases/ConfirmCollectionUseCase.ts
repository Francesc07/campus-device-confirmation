import { InvocationContext } from "@azure/functions";
import { IConfirmationActionRepository } from "../Interfaces/IConfirmationActionRepository";
import { IReservationSnapshotRepository } from "../Interfaces/IReservationSnapshotRepository";
import { ConfirmCollectionDTO } from "../Dtos/ConfirmCollectionDTO";
import { ConfirmationAction } from "../../Domain/Entities/ConfirmationAction";
import { ConfirmationActionType } from "../../Domain/Enums/ConfirmationActionType";
import { ConfirmationEventPublisher } from "../../Infrastructure/EventGrid/ConfirmationEventPublisher";
import { randomUUID } from "crypto";

export class ConfirmCollectionUseCase {
  constructor(
    private readonly repository: IConfirmationActionRepository,
    private readonly publisher: ConfirmationEventPublisher,
    private readonly snapshotRepo: IReservationSnapshotRepository
  ) {}

  async execute(data: ConfirmCollectionDTO, ctx?: InvocationContext): Promise<ConfirmationAction> {
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

    // Update snapshot status from PendingCollection -> Collected -> PendingReturn
    await this.snapshotRepo.updateStatus(reservationId, "Collected");
    await this.snapshotRepo.updateStatus(reservationId, "PendingReturn");

    ctx?.log("📤 Publishing Confirmation.Collected event", { reservationId, deviceId });
    await this.publisher.publish({
      eventType: "Confirmation.Collected",
      data: saved
    }, ctx);
    ctx?.log("✅ Confirmation.Collected event published successfully");

    return saved;
  }
}
