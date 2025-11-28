// src/Infrastructure/CosmosStaffActionRepository.ts
import { CosmosClient } from "@azure/cosmos";
import { StaffAction } from "../Domain/StaffAction";

export class CosmosStaffActionRepository {
  private container;
  constructor() {
    const endpoint = process.env.COSMOS_URI!;
    const key = process.env.COSMOS_KEY!;
    const client = new CosmosClient({ endpoint, key });
    const db = client.database("StaffServiceDB");
    this.container = db.container("StaffActions");
  }

  async record(action: StaffAction): Promise<void> {
    await this.container.items.create(action);
  }
}
