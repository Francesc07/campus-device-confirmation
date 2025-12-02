import { CosmosClient } from "@azure/cosmos";

let cosmosClient: CosmosClient | null = null;

export class CosmosClientFactory {
  static getClient(): CosmosClient {
    if (!cosmosClient) {
      const connectionString = process.env.COSMOS_DB_CONNECTION_STRING;
      
      if (!connectionString) {
        throw new Error("COSMOS_DB_CONNECTION_STRING environment variable is not set");
      }

      cosmosClient = new CosmosClient(connectionString);
    }

    return cosmosClient;
  }

  static getContainer(databaseId: string, containerId: string) {
    const client = this.getClient();
    const db = client.database(databaseId);
    return db.container(containerId);
  }
}
