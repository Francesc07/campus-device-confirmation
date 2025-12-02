import { ListStaffActionsUseCase } from "../UseCases/ListStaffActionsUseCase";

export class ListStaffActionsHandler {
  constructor(private readonly useCase: ListStaffActionsUseCase) {}

  execute(filter: { staffId?: string; reservationId?: string } = {}) {
    return this.useCase.execute(filter);
  }
}
