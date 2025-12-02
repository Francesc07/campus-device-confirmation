import { CosmosStaffActionRepository } from "./Infrastructure/Persistence/CosmosStaffActionRepository";
import { EventPublisher } from "./Infrastructure/EventGrid/StaffEventPublisher";

// Use Cases
import { ConfirmCollectionUseCase } from "./Application/UseCases/ConfirmCollectionUseCase";
import { ConfirmReturnUseCase } from "./Application/UseCases/ConfirmReturnUseCase";
import { ListStaffActionsUseCase } from "./Application/UseCases/ListStaffActionsUseCase";

// Handlers
import { ConfirmCollectionHandler } from "./Application/Handlers/ConfirmCollectionHandler";
import { ConfirmReturnHandler } from "./Application/Handlers/ConfirmReturnHandler";
import { ListStaffActionsHandler } from "./Application/Handlers/ListStaffActionsHandler";

// Instantiate infra layer
const repository = new CosmosStaffActionRepository();
const publisher = new EventPublisher();

// Wire UseCases + Handlers
export const appServices = {
  confirmCollectionHandler: new ConfirmCollectionHandler(
    new ConfirmCollectionUseCase(repository, publisher)
  ),

  confirmReturnHandler: new ConfirmReturnHandler(
    new ConfirmReturnUseCase(repository, publisher)
  ),

  listStaffActionsHandler: new ListStaffActionsHandler(
    new ListStaffActionsUseCase(repository)
  ),
};
