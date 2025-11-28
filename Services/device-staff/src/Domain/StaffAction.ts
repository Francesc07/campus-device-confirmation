// src/Domain/StaffAction.ts
export interface StaffAction {
  actionId: string;
  staffId: string;
  reservationId: string;
  actionType: "COLLECTION_CONFIRMED" | "RETURN_CONFIRMED";
  timestamp: string;
  notes?: string;
}
