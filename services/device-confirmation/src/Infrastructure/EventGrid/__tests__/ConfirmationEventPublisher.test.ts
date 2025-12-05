import { ConfirmationEventPublisher } from "../ConfirmationEventPublisher";
import { ConfirmationAction } from "../../../Domain/Entities/ConfirmationAction";
import { ConfirmationActionType } from "../../../Domain/Enums/ConfirmationActionType";

// Mock the @azure/eventgrid module
jest.mock("@azure/eventgrid");

import { EventGridPublisherClient } from "@azure/eventgrid";

describe("ConfirmationEventPublisher", () => {
  let publisher: ConfirmationEventPublisher;
  let mockClient: jest.Mocked<EventGridPublisherClient<any>>;
  let mockContext: any;

  beforeEach(() => {
    // Create mock client
    mockClient = {
      send: jest.fn(),
    } as any;

    // Mock the EventGridPublisherClient constructor
    (EventGridPublisherClient as jest.Mock).mockImplementation(() => mockClient);

    mockContext = {
      log: jest.fn(),
    };

    publisher = new ConfirmationEventPublisher(
      "https://test-topic.eventgrid.azure.net/api/events",
      "test-key-123"
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Successful Event Publishing", () => {
    it("should publish Confirmation.Collected event", async () => {
      const action: ConfirmationAction = {
        id: "action-123",
        staffId: "staff-001",
        reservationId: "res-456",
        deviceId: "dev-789",
        actionType: ConfirmationActionType.Collected,
        timestamp: new Date().toISOString(),
        notes: "Device collected",
      };

      mockClient.send.mockResolvedValue(undefined);

      await publisher.publish(
        {
          eventType: "Confirmation.Collected",
          data: action,
        },
        mockContext
      );

      expect(mockClient.send).toHaveBeenCalledWith([
        expect.objectContaining({
          id: expect.any(String),
          eventType: "Confirmation.Collected",
          subject: `confirmation/${action.reservationId}`,
          data: action,
          dataVersion: "1.0",
        }),
      ]);
    });

    it("should publish Confirmation.Returned event", async () => {
      const action: ConfirmationAction = {
        id: "action-456",
        staffId: "staff-002",
        reservationId: "res-789",
        deviceId: "dev-123",
        actionType: ConfirmationActionType.Returned,
        timestamp: new Date().toISOString(),
      };

      mockClient.send.mockResolvedValue(undefined);

      await publisher.publish(
        {
          eventType: "Confirmation.Returned",
          data: action,
        },
        mockContext
      );

      expect(mockClient.send).toHaveBeenCalledWith([
        expect.objectContaining({
          eventType: "Confirmation.Returned",
          subject: `confirmation/${action.reservationId}`,
          data: action,
        }),
      ]);
    });

    it("should generate unique event IDs", async () => {
      const action: ConfirmationAction = {
        id: "action-123",
        staffId: "staff-001",
        reservationId: "res-456",
        deviceId: "dev-789",
        actionType: ConfirmationActionType.Collected,
        timestamp: new Date().toISOString(),
      };

      mockClient.send.mockResolvedValue(undefined);

      await publisher.publish(
        {
          eventType: "Confirmation.Collected",
          data: action,
        },
        mockContext
      );

      await publisher.publish(
        {
          eventType: "Confirmation.Collected",
          data: action,
        },
        mockContext
      );

      const call1 = (mockClient.send as jest.Mock).mock.calls[0][0][0];
      const call2 = (mockClient.send as jest.Mock).mock.calls[1][0][0];

      expect(call1.id).not.toBe(call2.id);
    });

    it("should set eventTime to current time", async () => {
      const action: ConfirmationAction = {
        id: "action-123",
        staffId: "staff-001",
        reservationId: "res-456",
        deviceId: "dev-789",
        actionType: ConfirmationActionType.Collected,
        timestamp: new Date().toISOString(),
      };

      const beforeTime = new Date();
      mockClient.send.mockResolvedValue(undefined);

      await publisher.publish(
        {
          eventType: "Confirmation.Collected",
          data: action,
        },
        mockContext
      );

      const afterTime = new Date();
      const call = (mockClient.send as jest.Mock).mock.calls[0][0][0];
      const eventTime = new Date(call.eventTime);

      expect(eventTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(eventTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it("should include action data in event payload", async () => {
      const action: ConfirmationAction = {
        id: "action-123",
        staffId: "staff-001",
        reservationId: "res-456",
        deviceId: "dev-789",
        actionType: ConfirmationActionType.Collected,
        timestamp: new Date().toISOString(),
        notes: "Test notes",
      };

      mockClient.send.mockResolvedValue(undefined);

      await publisher.publish(
        {
          eventType: "Confirmation.Collected",
          data: action,
        },
        mockContext
      );

      const call = (mockClient.send as jest.Mock).mock.calls[0][0][0];

      expect(call.data).toEqual(action);
      expect(call.data.notes).toBe("Test notes");
    });

    it("should set correct subject with reservationId", async () => {
      const action: ConfirmationAction = {
        id: "action-123",
        staffId: "staff-001",
        reservationId: "specific-res-999",
        deviceId: "dev-789",
        actionType: ConfirmationActionType.Collected,
        timestamp: new Date().toISOString(),
      };

      mockClient.send.mockResolvedValue(undefined);

      await publisher.publish(
        {
          eventType: "Confirmation.Collected",
          data: action,
        },
        mockContext
      );

      const call = (mockClient.send as jest.Mock).mock.calls[0][0][0];

      expect(call.subject).toBe("confirmation/specific-res-999");
    });

    it("should set dataVersion to 1.0", async () => {
      const action: ConfirmationAction = {
        id: "action-123",
        staffId: "staff-001",
        reservationId: "res-456",
        deviceId: "dev-789",
        actionType: ConfirmationActionType.Collected,
        timestamp: new Date().toISOString(),
      };

      mockClient.send.mockResolvedValue(undefined);

      await publisher.publish(
        {
          eventType: "Confirmation.Collected",
          data: action,
        },
        mockContext
      );

      const call = (mockClient.send as jest.Mock).mock.calls[0][0][0];

      expect(call.dataVersion).toBe("1.0");
    });
  });

  describe("Logging", () => {
    it("should log when sending event", async () => {
      const action: ConfirmationAction = {
        id: "action-123",
        staffId: "staff-001",
        reservationId: "res-456",
        deviceId: "dev-789",
        actionType: ConfirmationActionType.Collected,
        timestamp: new Date().toISOString(),
      };

      mockClient.send.mockResolvedValue(undefined);

      await publisher.publish(
        {
          eventType: "Confirmation.Collected",
          data: action,
        },
        mockContext
      );

      expect(mockContext.log).toHaveBeenCalledWith(
        "📡 Sending event to Event Grid",
        expect.objectContaining({
          eventType: "Confirmation.Collected",
          subject: "confirmation/res-456",
          eventId: expect.any(String),
        })
      );
    });

    it("should log success after sending event", async () => {
      const action: ConfirmationAction = {
        id: "action-123",
        staffId: "staff-001",
        reservationId: "res-456",
        deviceId: "dev-789",
        actionType: ConfirmationActionType.Collected,
        timestamp: new Date().toISOString(),
      };

      mockClient.send.mockResolvedValue(undefined);

      await publisher.publish(
        {
          eventType: "Confirmation.Collected",
          data: action,
        },
        mockContext
      );

      expect(mockContext.log).toHaveBeenCalledWith(
        "✅ Event sent to Event Grid successfully"
      );
    });

    it("should not log when context is not provided", async () => {
      const action: ConfirmationAction = {
        id: "action-123",
        staffId: "staff-001",
        reservationId: "res-456",
        deviceId: "dev-789",
        actionType: ConfirmationActionType.Collected,
        timestamp: new Date().toISOString(),
      };

      mockClient.send.mockResolvedValue(undefined);

      await publisher.publish(
        {
          eventType: "Confirmation.Collected",
          data: action,
        },
        undefined
      );

      expect(mockContext.log).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should throw and log error when Event Grid send fails", async () => {
      const action: ConfirmationAction = {
        id: "action-123",
        staffId: "staff-001",
        reservationId: "res-456",
        deviceId: "dev-789",
        actionType: ConfirmationActionType.Collected,
        timestamp: new Date().toISOString(),
      };

      const error = new Error("Event Grid connection timeout");
      mockClient.send.mockRejectedValue(error);

      await expect(
        publisher.publish(
          {
            eventType: "Confirmation.Collected",
            data: action,
          },
          mockContext
        )
      ).rejects.toThrow("Event Grid connection timeout");

      expect(mockContext.log).toHaveBeenCalledWith(
        "❌ Failed to send event to Event Grid",
        error
      );
    });

    it("should handle authentication errors", async () => {
      const action: ConfirmationAction = {
        id: "action-123",
        staffId: "staff-001",
        reservationId: "res-456",
        deviceId: "dev-789",
        actionType: ConfirmationActionType.Collected,
        timestamp: new Date().toISOString(),
      };

      const authError = new Error("Invalid Event Grid key");
      mockClient.send.mockRejectedValue(authError);

      await expect(
        publisher.publish(
          {
            eventType: "Confirmation.Collected",
            data: action,
          },
          mockContext
        )
      ).rejects.toThrow("Invalid Event Grid key");
    });

    it("should handle network errors", async () => {
      const action: ConfirmationAction = {
        id: "action-123",
        staffId: "staff-001",
        reservationId: "res-456",
        deviceId: "dev-789",
        actionType: ConfirmationActionType.Collected,
        timestamp: new Date().toISOString(),
      };

      const networkError = new Error("Network unreachable");
      mockClient.send.mockRejectedValue(networkError);

      await expect(
        publisher.publish(
          {
            eventType: "Confirmation.Collected",
            data: action,
          },
          mockContext
        )
      ).rejects.toThrow("Network unreachable");
    });
  });
});
