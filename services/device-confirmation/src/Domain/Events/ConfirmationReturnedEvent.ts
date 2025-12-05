export interface ConfirmationReturnedEvent {
  eventType: "Confirmation.Returned";
  data: {
    reservationId: string;
    deviceId: string;
    staffId: string;
    timestamp: string;
  };
}