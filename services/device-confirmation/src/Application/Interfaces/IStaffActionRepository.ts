import { StaffAction } from "../../Domain/Entities/StaffAction";

export interface IStaffActionRepository {
  /**
   * Create a new staff action entry.
   */
  create(action: StaffAction): Promise<StaffAction>;

  /**
   * Find a specific staff action by its ID.
   */
  findById(id: string): Promise<StaffAction | null>;

  /**
   * List all actions performed by a specific staff member.
   */
  findByStaffId(staffId: string): Promise<StaffAction[]>;

  /**
   * List all actions performed on a specific reservation.
   */
  findByReservationId(reservationId: string): Promise<StaffAction[]>;

  /**
   * List all staff actions in the system.
   * Useful for admin audit dashboards.
   */
  findAll(): Promise<StaffAction[]>;

  /**
   * Delete a staff action.
   * (Optional but useful for admin/HR)
   */
  delete(id: string): Promise<void>;
}
