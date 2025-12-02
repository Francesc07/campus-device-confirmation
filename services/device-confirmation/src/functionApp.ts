import { app } from "@azure/functions";

// HTTP Endpoints
import "./API/functions/confirm-collection-http";
import "./API/functions/confirm-return-http";
import "./API/functions/list-staff-actions-http";

import "./API/functions/reservation-events-http";



export default app;
