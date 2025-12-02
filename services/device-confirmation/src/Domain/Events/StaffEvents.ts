export interface StaffCollectionConfirmedEvent {
  reservationId: string;
  deviceId: string;
  staffId: string;
  timestamp: string;
}

export interface StaffReturnConfirmedEvent {
  reservationId: string;
  deviceId: string;
  staffId: string;
  timestamp: string;
}
