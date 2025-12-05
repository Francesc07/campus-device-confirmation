export interface ConfirmationCollectedEvent {
  eventType: "Confirmation.Collected";
  data: {
    reservationId: string;
    deviceId: string;
    staffId: string;
    timestamp: string;
  };
}
