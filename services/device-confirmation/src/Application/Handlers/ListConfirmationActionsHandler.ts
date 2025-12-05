import { ListConfirmationActionsUseCase } from "../UseCases/ListConfirmationActionsUseCase";

export class ListConfirmationActionsHandler {
  constructor(private readonly useCase: ListConfirmationActionsUseCase) {}

  execute(filter: { staffId?: string; reservationId?: string } = {}) {
    return this.useCase.execute(filter);
  }
}
