import { IStaffActionRepository } from "../Interfaces/IStaffActionRepository";
import { ConfirmCollectionDTO } from "../Dtos/ConfirmCollectionDTO";
import { StaffAction } from "../../Domain/Entities/StaffAction";
import { StaffActionType } from "../../Domain/Enums/StaffActionType";
import { EventPublisher } from "../../Infrastructure/EventGrid/StaffEventPublisher";
import { randomUUID } from "crypto";

export class ConfirmCollectionUseCase {
  constructor(
    private readonly repository: IStaffActionRepository,
    private readonly publisher: EventPublisher
  ) {}

  async execute(data: ConfirmCollectionDTO): Promise<StaffAction> {
    const { staffId, reservationId, deviceId, notes } = data;

    if (!staffId || !reservationId || !deviceId) {
      throw new Error("staffId, reservationId, and deviceId are required.");
    }

    const action: StaffAction = {
      id: randomUUID(),
      staffId,
      reservationId,
      deviceId,
      actionType: StaffActionType.CollectionConfirmed,
      timestamp: new Date().toISOString(),
      notes
    };

    const saved = await this.repository.create(action);

    // 🔥 Publish outbound event
    await this.publisher.publishStaffEvent("Staff.CollectionConfirmed", saved);

    return saved;
  }
}
