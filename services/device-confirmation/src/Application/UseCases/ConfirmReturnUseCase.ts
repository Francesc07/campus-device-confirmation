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

    // IDEMPOTENCY: Check if return already confirmed for this reservation
    const existingActions = await this.repository.findByReservationId(reservationId);
    const alreadyReturned = existingActions.find(
      action => action.actionType === ConfirmationActionType.Returned && action.deviceId === deviceId
    );
    
    if (alreadyReturned) {
      ctx?.log("⚠️ Return already confirmed (idempotent)", { reservationId, deviceId, existingActionId: alreadyReturned.id });
      
      // IMPORTANT: Still ensure snapshot is in correct state
      const snapshot = await this.snapshotRepo.getByReservationId(reservationId);
      if (snapshot && snapshot.status === "PendingReturn") {
        ctx?.log("🔄 Updating snapshot status for idempotent return", { reservationId, fromStatus: snapshot.status, toStatus: "Returned" });
        await this.snapshotRepo.updateStatus(reservationId, "Returned");
      }
      
      return alreadyReturned;
    }

    // PREREQUISITE: Check if collection was confirmed before allowing return
    const alreadyCollected = existingActions.find(
      action => action.actionType === ConfirmationActionType.Collected && action.deviceId === deviceId
    );
    
    if (!alreadyCollected) {
      ctx?.log("⚠️ Cannot confirm return: device has not been collected yet", { reservationId, deviceId });
      throw new Error("Cannot confirm return: device has not been collected yet");
    }

    // Check current snapshot status to prevent invalid state transitions
    let snapshot = await this.snapshotRepo.getByReservationId(reservationId);
    
    // If snapshot doesn't exist, create it if collection was confirmed
    if (!snapshot) {
      ctx?.log("⚠️ Snapshot not found but collection confirmed, creating snapshot", { reservationId });
      // Create snapshot with PendingReturn status since collection already happened
      snapshot = {
        reservationId,
        deviceId,
        userId: staffId,
        startDate: alreadyCollected.timestamp,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "PendingReturn",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await this.snapshotRepo.save(snapshot);
    } else if (snapshot.status === "PendingCollection") {
      // Snapshot exists but in wrong state - update it
      ctx?.log("🔄 Snapshot in wrong state, updating to PendingReturn", { currentStatus: snapshot.status });
      await this.snapshotRepo.updateStatus(reservationId, "Collected");
      await this.snapshotRepo.updateStatus(reservationId, "PendingReturn");
    } else if (snapshot.status !== "PendingReturn" && snapshot.status !== "Collected") {
      ctx?.log("⚠️ Invalid state transition", { currentStatus: snapshot.status, expectedStatus: "PendingReturn" });
      throw new Error(`Cannot confirm return. Current status: ${snapshot.status}. Expected: PendingReturn`);
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
