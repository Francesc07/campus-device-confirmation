import { InvocationContext } from "@azure/functions";
import { ConfirmReturnUseCase } from "../UseCases/ConfirmReturnUseCase";

export class ConfirmReturnHandler {
  constructor(private readonly useCase: ConfirmReturnUseCase) {}

  execute(staffId: string, reservationId: string, deviceId: string, notes?: string, ctx?: InvocationContext) {
    return this.useCase.execute({ staffId, reservationId, deviceId, notes }, ctx);
  }
}
