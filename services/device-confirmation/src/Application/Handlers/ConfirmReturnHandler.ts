import { ConfirmReturnUseCase } from "../UseCases/ConfirmReturnUseCase";

export class ConfirmReturnHandler {
  constructor(private readonly useCase: ConfirmReturnUseCase) {}

  execute(staffId: string, reservationId: string, deviceId: string, notes?: string) {
    return this.useCase.execute({ staffId, reservationId, deviceId, notes });
  }
}
