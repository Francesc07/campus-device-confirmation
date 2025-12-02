import { IStaffActionRepository } from "../Interfaces/IStaffActionRepository";
import { ConfirmReturnDTO } from "../Dtos/ConfirmReturnDTO";
import { StaffAction } from "../../Domain/Entities/StaffAction";
import { StaffActionType } from "../../Domain/Enums/StaffActionType";
import { EventPublisher } from "../../Infrastructure/EventGrid/StaffEventPublisher";
import { randomUUID } from "crypto";

export class ConfirmReturnUseCase {
  constructor(
    private readonly repository: IStaffActionRepository,
    private readonly publisher: EventPublisher
  ) {}

  async execute(data: ConfirmReturnDTO): Promise<StaffAction> {
    const { staffId, reservationId, deviceId, notes } = data;

    if (!staffId || !reservationId || !deviceId) {
      throw new Error("staffId, reservationId, and deviceId are required.");
    }

    const action: StaffAction = {
      id: randomUUID(),
      staffId,
      reservationId,
      deviceId,
      actionType: StaffActionType.ReturnConfirmed,
      timestamp: new Date().toISOString(),
      notes
    };

    const saved = await this.repository.create(action);

    // 🔥 Publish outbound event
    await this.publisher.publishStaffEvent("Staff.ReturnConfirmed", saved);

    return saved;
  }
}
