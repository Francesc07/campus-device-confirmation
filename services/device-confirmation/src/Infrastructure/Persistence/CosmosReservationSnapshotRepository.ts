import { CosmosClient } from "@azure/cosmos";
import { ReservationSnapshot } from "../../Domain/Entities/ReservationSnapshot";
import { IReservationSnapshotRepository } from "../../Application/Interfaces/IReservationSnapshotRepository";
import { environment } from "../../Infrastructure/Config/environment";

export class CosmosReservationSnapshotRepository
  implements IReservationSnapshotRepository
{
  private container;

  constructor() {
    const client = new CosmosClient(environment.cosmos.connectionString);

    this.container = client
      .database(environment.cosmos.databaseName)
      .container(environment.cosmos.snapshotContainer); // e.g: "ReservationSnapshots"
  }

  async save(snapshot: ReservationSnapshot): Promise<void> {
    await this.container.items.upsert(snapshot);
  }

  async getByReservationId(
    reservationId: string
  ): Promise<ReservationSnapshot | null> {
    const query = {
      query: "SELECT * FROM c WHERE c.reservationId = @reservationId",
      parameters: [{ name: "@reservationId", value: reservationId }],
    };

    const { resources } = await this.container.items.query(query).fetchAll();
    return resources.length > 0 ? resources[0] : null;
  }

  async listPendingCollections(): Promise<ReservationSnapshot[]> {
    const query = {
      query: "SELECT * FROM c WHERE c.status = 'PendingCollection'",
    };

    const { resources } = await this.container.items.query(query).fetchAll();
    return resources;
  }

  async listPendingReturns(): Promise<ReservationSnapshot[]> {
    const query = {
      query: "SELECT * FROM c WHERE c.status = 'PendingReturn'",
    };

    const { resources } = await this.container.items.query(query).fetchAll();
    return resources;
  }

  async updateStatus(
    reservationId: string,
    status: "PendingCollection" | "Collected" | "PendingReturn" | "Returned"
  ): Promise<void> {
    const snapshot = await this.getByReservationId(reservationId);
    if (!snapshot) return;

    snapshot.status = status;
    snapshot.updatedAt = new Date().toISOString();

    await this.container.items.upsert(snapshot);
  }
}
