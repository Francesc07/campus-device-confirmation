// src/Application/StaffService.ts
import { StaffAction } from "../Domain/StaffAction";

export class StaffService {
  constructor(private repo: { record(a: StaffAction): Promise<void> }) {}

  async confirmCollection(staffId: string, reservationId: string, notes?: string): Promise<StaffAction> {
    const action: StaffAction = {
      actionId: crypto.randomUUID(),
      staffId,
      reservationId,
      actionType: "COLLECTION_CONFIRMED",
      timestamp: new Date().toISOString(),
      notes
    };
    await this.repo.record(action);
    return action;
  }

  async confirmReturn(staffId: string, reservationId: string, notes?: string): Promise<StaffAction> {
    const action: StaffAction = {
      actionId: crypto.randomUUID(),
      staffId,
      reservationId,
      actionType: "RETURN_CONFIRMED",
      timestamp: new Date().toISOString(),
      notes
    };
    await this.repo.record(action);
    return action;
  }
}
