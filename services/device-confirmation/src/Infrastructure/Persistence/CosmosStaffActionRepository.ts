import { CosmosClient } from "@azure/cosmos";
import { StaffAction } from "../../Domain/Entities/StaffAction";
import { IStaffActionRepository } from "../../Application/Interfaces/IStaffActionRepository";
import { CosmosClientFactory } from "../Config/CosmosClientFactory";

export class CosmosStaffActionRepository implements IStaffActionRepository {
  private container;

  constructor() {
    const databaseName = process.env.COSMOS_DB_DATABASE_NAME;
    const containerName = process.env.COSMOS_DB_CONTAINER_NAME ;
    
    this.container = CosmosClientFactory.getContainer(databaseName, containerName);
  }

  async create(action: StaffAction): Promise<StaffAction> {
    const { resource } = await this.container.items.create(action);
    return resource as StaffAction;
  }

  async findById(id: string): Promise<StaffAction | null> {
    const query = {
      query: "SELECT * FROM c WHERE c.id = @id",
      parameters: [{ name: "@id", value: id }]
    };

    const { resources } = await this.container.items.query(query).fetchAll();

    return resources.length === 1 ? (resources[0] as StaffAction) : null;
  }

  async findByStaffId(staffId: string): Promise<StaffAction[]> {
    const query = {
      query: "SELECT * FROM c WHERE c.staffId = @staffId",
      parameters: [{ name: "@staffId", value: staffId }]
    };

    const { resources } = await this.container.items.query(query).fetchAll();

    return resources as StaffAction[];
  }

  async findByReservationId(reservationId: string): Promise<StaffAction[]> {
    const query = {
      query: "SELECT * FROM c WHERE c.reservationId = @reservationId",
      parameters: [{ name: "@reservationId", value: reservationId }]
    };

    const { resources } = await this.container.items.query(query).fetchAll();

    return resources as StaffAction[];
  }

  async findAll(): Promise<StaffAction[]> {
    const { resources } = await this.container.items.readAll().fetchAll();
    return resources as StaffAction[];
  }

  async delete(id: string): Promise<void> {
    const record = await this.findById(id);
    if (!record) return;

    await this.container.item(record.id, record.staffId).delete();
  }
}
