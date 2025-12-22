import { ReservationSnapshot } from "../../Domain/Entities/ReservationSnapshot";

export interface IReservationSnapshotRepository {
  save(snapshot: ReservationSnapshot): Promise<void>;

  getByReservationId(reservationId: string): Promise<ReservationSnapshot | null>;

  listPendingCollections(): Promise<ReservationSnapshot[]>;

  listPendingReturns(): Promise<ReservationSnapshot[]>;

  listCollected(): Promise<ReservationSnapshot[]>;

  listReturned(): Promise<ReservationSnapshot[]>;

  listAll(): Promise<ReservationSnapshot[]>;

  updateStatus(
    reservationId: string,
    status: "PendingCollection" | "Collected" | "PendingReturn" | "Returned"
  ): Promise<void>;
}
