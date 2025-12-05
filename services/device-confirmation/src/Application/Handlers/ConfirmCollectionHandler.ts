import { InvocationContext } from "@azure/functions";
import { ConfirmCollectionUseCase } from "../UseCases/ConfirmCollectionUseCase";

export class ConfirmCollectionHandler {
  constructor(private readonly useCase: ConfirmCollectionUseCase) {}

  execute(staffId: string, reservationId: string, deviceId: string, notes?: string, ctx?: InvocationContext) {
    return this.useCase.execute({ staffId, reservationId, deviceId, notes }, ctx);
  }
}
