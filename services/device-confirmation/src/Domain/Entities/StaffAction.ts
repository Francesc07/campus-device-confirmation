import { StaffActionType } from "../Enums/StaffActionType";

export interface StaffAction {
  id: string;              // Unique action ID
  staffId: string;         // The staff performing the action
  reservationId: string;   // Link to the reservation
  deviceId: string;        // The device being collected/returned
  actionType: StaffActionType;
  timestamp: string;       // ISO timestamp
  notes?: string;          // Optional audit notes
}
