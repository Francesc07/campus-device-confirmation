export interface ReservationSnapshot {
  reservationId: string;
  deviceId: string;
  userId: string;

  // Device metadata from loan events
  deviceBrand?: string;
  deviceModel?: string;

  // User metadata from loan events
  userEmail?: string;

  startDate: string;
  dueDate: string;

  status: "PendingCollection" | "Collected" | "PendingReturn" | "Returned";

  createdAt: string;
  updatedAt: string;
}
