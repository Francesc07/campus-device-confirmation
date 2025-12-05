import { CosmosConfirmationActionRepository } from "./Infrastructure/Persistence/CosmosConfirmationActionRepository";
import { ConfirmationEventPublisher } from "./Infrastructure/EventGrid/ConfirmationEventPublisher";

import { ConfirmCollectionUseCase } from "./Application/UseCases/ConfirmCollectionUseCase";
import { ConfirmReturnUseCase } from "./Application/UseCases/ConfirmReturnUseCase";
import { ListConfirmationActionsUseCase } from "./Application/UseCases/ListConfirmationActionsUseCase";

import { ConfirmCollectionHandler } from "./Application/Handlers/ConfirmCollectionHandler";
import { ConfirmReturnHandler } from "./Application/Handlers/ConfirmReturnHandler";
import { ListConfirmationActionsHandler } from "./Application/Handlers/ListConfirmationActionsHandler";
import { CosmosReservationSnapshotRepository } from "./Infrastructure/Persistence/CosmosReservationSnapshotRepository";

const confirmationRepo = new CosmosConfirmationActionRepository();
const snapshotRepo = new CosmosReservationSnapshotRepository();
const eventPublisher = new ConfirmationEventPublisher(
  process.env.EVENTGRID_TOPIC_ENDPOINT!,
  process.env.EVENTGRID_TOPIC_KEY!
);

const confirmCollectionUseCase = new ConfirmCollectionUseCase(
  confirmationRepo,
  eventPublisher,
  snapshotRepo
);

const confirmReturnUseCase = new ConfirmReturnUseCase(
  confirmationRepo,
  eventPublisher,
  snapshotRepo
);

const listConfirmationActionsUseCase = new ListConfirmationActionsUseCase(
  confirmationRepo
);

const confirmCollectionHandler = new ConfirmCollectionHandler(confirmCollectionUseCase);
const confirmReturnHandler = new ConfirmReturnHandler(confirmReturnUseCase);
const listConfirmationActionsHandler = new ListConfirmationActionsHandler(
  listConfirmationActionsUseCase
);

export const appServices = {
  snapshotRepo,
  confirmationRepo,
  eventPublisher,
  confirmCollectionUseCase,
  confirmReturnUseCase,
  listConfirmationActionsUseCase,
  confirmCollectionHandler,
  confirmReturnHandler,
  listConfirmationActionsHandler
};
