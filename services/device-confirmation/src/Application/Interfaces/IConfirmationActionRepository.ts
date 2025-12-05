import { ConfirmationAction } from "../../Domain/Entities/ConfirmationAction";

export interface IConfirmationActionRepository {
  create(action: ConfirmationAction): Promise<ConfirmationAction>;
  findById(id: string): Promise<ConfirmationAction | null>;
  findByStaffId(staffId: string): Promise<ConfirmationAction[]>;
  findByReservationId(reservationId: string): Promise<ConfirmationAction[]>;
  findAll(): Promise<ConfirmationAction[]>;
  delete(id: string): Promise<void>;
}
