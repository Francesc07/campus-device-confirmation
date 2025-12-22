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
    // Ensure id field matches reservationId for Cosmos DB
    const doc = { ...snapshot, id: snapshot.reservationId };
    await this.container.items.upsert(doc);
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

  async listCollected(): Promise<ReservationSnapshot[]> {
    const query = {
      query: "SELECT * FROM c WHERE c.status = 'Collected'",
    };

    const { resources } = await this.container.items.query(query).fetchAll();
    return resources;
  }

  async listReturned(): Promise<ReservationSnapshot[]> {
    const query = {
      query: "SELECT * FROM c WHERE c.status = 'Returned'",
    };

    const { resources } = await this.container.items.query(query).fetchAll();
    return resources;
  }

  async listAll(): Promise<ReservationSnapshot[]> {
    const query = {
      query: "SELECT * FROM c ORDER BY c.createdAt DESC",
    };

    const { resources } = await this.container.items.query(query).fetchAll();
    return resources;
  }

  async updateStatus(
    reservationId: string,
    status: "PendingCollection" | "Collected" | "PendingReturn" | "Returned"
  ): Promise<void> {
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      try {
        // Get snapshot with _etag for optimistic concurrency control
        const query = {
          query: "SELECT * FROM c WHERE c.reservationId = @reservationId",
          parameters: [{ name: "@reservationId", value: reservationId }],
        };
        const { resources } = await this.container.items.query(query).fetchAll();
        
        if (resources.length === 0) {
          const errorMsg = `No snapshot found for reservationId: ${reservationId}. Cannot update status to ${status}.`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        }

        const snapshot = resources[0] as ReservationSnapshot & { id?: string; _etag?: string };
        const etag = snapshot._etag;
        const docId = snapshot.id || reservationId; // Use document's id field

        // Update snapshot
        snapshot.status = status;
        snapshot.updatedAt = new Date().toISOString();

        // Use replace with etag for optimistic concurrency control
        // Note: reservationId is used as partition key, docId is the document id
        if (etag) {
          await this.container
            .item(docId, reservationId)
            .replace(snapshot, { accessCondition: { type: "IfMatch", condition: etag } });
        } else {
          // Fallback to upsert if no etag
          const doc = { ...snapshot, id: docId };
          await this.container.items.upsert(doc);
        }

        // Success - exit retry loop
        return;
      } catch (error: any) {
        // Handle concurrency conflict (412 Precondition Failed)
        if (error.code === 412) {
          attempt++;
          if (attempt >= MAX_RETRIES) {
            throw new Error(`Failed to update status after ${MAX_RETRIES} retries due to concurrency conflicts`);
          }
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
          continue;
        }
        // Other errors - throw immediately
        throw error;
      }
    }
  }
}
