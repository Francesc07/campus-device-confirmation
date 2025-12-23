import { ConfirmationActionType } from "../Enums/ConfirmationActionType";

export interface ConfirmationAction {
  id: string;             // audit ID
  reservationId: string;  // reservation this action relates to
  deviceId: string;       // device being confirmed
  staffId: string;        // who performed the action.
  actionType: ConfirmationActionType;
  timestamp: string;      // ISO
  notes?: string;
}
