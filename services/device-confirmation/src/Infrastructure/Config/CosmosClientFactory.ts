import { CosmosClient } from "@azure/cosmos";
import { environment } from "./environment";

let cosmosClient: CosmosClient | null = null;

export class CosmosClientFactory {
  static getClient(): CosmosClient {
    if (!cosmosClient) {
      cosmosClient = new CosmosClient(environment.cosmos.connectionString);
    }
    return cosmosClient;
  }

  static getContainer() {
    return this.getClient()
      .database(environment.cosmos.databaseName)
      .container(environment.cosmos.containerName);
  }
}
