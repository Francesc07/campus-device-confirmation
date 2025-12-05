import { IConfirmationActionRepository } from "../Interfaces/IConfirmationActionRepository";
import { ListConfirmationActionsDTO } from "../Dtos/ListConfirmationActionsDTO";
import { ConfirmationAction } from "../../Domain/Entities/ConfirmationAction";

export class ListConfirmationActionsUseCase {
  constructor(private readonly repository: IConfirmationActionRepository) {}

  execute(filter: ListConfirmationActionsDTO): Promise<ConfirmationAction[]> {
    if (filter.staffId) {
      return this.repository.findByStaffId(filter.staffId);
    }
    if (filter.reservationId) {
      return this.repository.findByReservationId(filter.reservationId);
    }
    return this.repository.findAll();
  }
}
