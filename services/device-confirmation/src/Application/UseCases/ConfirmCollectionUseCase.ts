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

    // IDEMPOTENCY: Check if collection already confirmed for this reservation
    const existingActions = await this.repository.findByReservationId(reservationId);
    const alreadyCollected = existingActions.find(
      action => action.actionType === ConfirmationActionType.Collected && action.deviceId === deviceId
    );
    
    if (alreadyCollected) {
      ctx?.log("⚠️ Collection already confirmed (idempotent)", { reservationId, deviceId, existingActionId: alreadyCollected.id });
      
      // IMPORTANT: Still ensure snapshot is in correct state for returns
      const snapshot = await this.snapshotRepo.getByReservationId(reservationId);
      if (snapshot && snapshot.status === "PendingCollection") {
        ctx?.log("🔄 Updating snapshot status for idempotent collection", { reservationId, fromStatus: snapshot.status, toStatus: "PendingReturn" });
        await this.snapshotRepo.updateStatus(reservationId, "Collected");
        await this.snapshotRepo.updateStatus(reservationId, "PendingReturn");
      }
      
      return alreadyCollected;
    }

    // Check current snapshot status to prevent invalid state transitions
    let snapshot = await this.snapshotRepo.getByReservationId(reservationId);
    
    // If snapshot doesn't exist, create it with PendingCollection status
    // This handles cases where the reservation event wasn't received/processed
    if (!snapshot) {
      ctx?.log("⚠️ Snapshot not found, creating new one", { reservationId, status: "PendingCollection" });
      snapshot = {
        reservationId,
        deviceId,
        userId: staffId, // Use staffId as fallback since we don't have userId
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default 7 days
        status: "PendingCollection",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await this.snapshotRepo.save(snapshot);
    } else if (snapshot.status !== "PendingCollection") {
      ctx?.log("⚠️ Invalid state transition", { currentStatus: snapshot.status, expectedStatus: "PendingCollection" });
      throw new Error(`Cannot confirm collection. Current status: ${snapshot.status}. Expected: PendingCollection`);
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
    ctx?.log("✅ Snapshot updated", { reservationId, status: "PendingReturn" });

    ctx?.log("📤 Publishing Confirmation.Collected event", { reservationId, deviceId });
    await this.publisher.publish({
      eventType: "Confirmation.Collected",
      data: saved
    }, ctx);
    ctx?.log("✅ Confirmation.Collected event published successfully");

    return saved;
  }
}
