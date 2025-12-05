export interface ReservationSnapshot {
  reservationId: string;
  deviceId: string;
  userId: string;

  startDate: string;
  dueDate: string;

  status: "PendingCollection" | "Collected" | "PendingReturn" | "Returned";

  createdAt: string;
  updatedAt: string;
}
