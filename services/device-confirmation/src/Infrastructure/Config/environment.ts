/**
 * Resolve active environment:
 * - local
 * - dev
 * - test
 * - prod
 */
function getEnvironmentName(): string {
  const slot = process.env.WEBSITE_SLOT_NAME;

  if (!slot) return "local";
  if (slot === "dev") return "dev";
  if (slot === "test") return "test";
  if (slot === "production") return "prod";

  return slot.toLowerCase();
}

const activeEnv = getEnvironmentName();

/**
 * Helper to load environment variables
 * with support for:
 *   DEV_*
 *   TEST_*
 *   PROD_*
 *   or fallback VAR
 */
function getEnv(baseVar: string): string {
  const prefix = activeEnv === "local" ? "" : `${activeEnv.toUpperCase()}_`;

  const value =
    process.env[`${prefix}${baseVar}`] ||
    process.env[baseVar];

  if (!value) {
    throw new Error(
      `Missing environment variable: ${prefix}${baseVar} or ${baseVar}`
    );
  }

  return value;
}

/**
 * Helper to load optional environment variables
 */
function getEnvOptional(baseVar: string): string | undefined {
  const prefix = activeEnv === "local" ? "" : `${activeEnv.toUpperCase()}_`;

  return process.env[`${prefix}${baseVar}`] || process.env[baseVar];
}

export const environment = {
  name: activeEnv,

  auth0: {
    domain: getEnv("AUTH0_DOMAIN"),
    audience: getEnv("AUTH0_AUDIENCE"),
  },

  cosmos: {
    connectionString: getEnv("COSMOS_DB_CONNECTION_STRING"),
    databaseName: getEnv("COSMOS_DB_DATABASE_NAME"),
    containerName: getEnv("COSMOS_DB_CONTAINER_NAME"),
    snapshotContainer: "ReservationSnapshots"
  },

  eventGrid: {
    confirmEndpoint: getEnv("EVENTGRID_TOPIC_ENDPOINT"),
    confirmKey: getEnv("EVENTGRID_TOPIC_KEY")
  },

  // SendGrid Email Configuration (optional)
  SENDGRID_API_KEY: getEnvOptional("SENDGRID_API_KEY"),
  SENDGRID_FROM_EMAIL: getEnvOptional("SENDGRID_FROM_EMAIL") || "noreply@devicelending.com"
  
};

