import { IStaffActionRepository } from "../Interfaces/IStaffActionRepository";
import { ListStaffActionsDTO } from "../Dtos/ListStaffActionsDTO";
import { StaffAction } from "../../Domain/Entities/StaffAction";

export class ListStaffActionsUseCase {
  constructor(private readonly repository: IStaffActionRepository) {}

  async execute(filter: ListStaffActionsDTO): Promise<StaffAction[]> {
    if (filter.staffId) {
      return this.repository.findByStaffId(filter.staffId);
    }

    if (filter.reservationId) {
      return this.repository.findByReservationId(filter.reservationId);
    }

    return this.repository.findAll();
  }
}
