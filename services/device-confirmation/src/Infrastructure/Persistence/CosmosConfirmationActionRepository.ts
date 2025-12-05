import { ConfirmationAction } from "../../Domain/Entities/ConfirmationAction";
import { IConfirmationActionRepository } from "../../Application/Interfaces/IConfirmationActionRepository";
import { CosmosClientFactory } from "../Config/CosmosClientFactory";

export class CosmosConfirmationActionRepository implements IConfirmationActionRepository {
  private container = CosmosClientFactory.getContainer();

  async create(action: ConfirmationAction): Promise<ConfirmationAction> {
    const { resource } = await this.container.items.create(action);
    return resource as ConfirmationAction;
  }

  async findById(id: string): Promise<ConfirmationAction | null> {
    const query = {
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: id }]
    };
    const { resources } = await this.container.items.query(query).fetchAll();
    return resources[0] ?? null;
  }

  async findByStaffId(staffId: string): Promise<ConfirmationAction[]> {
    const query = {
      query: "SELECT * FROM c WHERE c.staffId = @staffId",
      parameters: [{ name: "@staffId", value: staffId }]
    };
    const { resources } = await this.container.items.query(query).fetchAll();
    return resources as ConfirmationAction[];
  }

  async findByReservationId(reservationId: string): Promise<ConfirmationAction[]> {
    const query = {
      query: "SELECT * FROM c WHERE c.reservationId = @reservationId",
      parameters: [{ name: "@reservationId", value: reservationId }]
    };
    const { resources } = await this.container.items.query(query).fetchAll();
    return resources as ConfirmationAction[];
  }

  async findAll(): Promise<ConfirmationAction[]> {
    const { resources } = await this.container.items.readAll().fetchAll();
    return resources as ConfirmationAction[];
  }

  async delete(id: string): Promise<void> {
    const item = await this.findById(id);
    if (!item) return;
    await this.container.item(item.id, item.reservationId).delete();
  }
}
