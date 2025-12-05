import { ConfirmCollectionUseCase } from "../ConfirmCollectionUseCase";
import { IConfirmationActionRepository } from "../../Interfaces/IConfirmationActionRepository";
import { IReservationSnapshotRepository } from "../../Interfaces/IReservationSnapshotRepository";
import { ConfirmationEventPublisher } from "../../../Infrastructure/EventGrid/ConfirmationEventPublisher";
import { ConfirmationActionType } from "../../../Domain/Enums/ConfirmationActionType";
import { ConfirmationAction } from "../../../Domain/Entities/ConfirmationAction";

describe("ConfirmCollectionUseCase", () => {
  let useCase: ConfirmCollectionUseCase;
  let mockRepository: jest.Mocked<IConfirmationActionRepository>;
  let mockSnapshotRepo: jest.Mocked<IReservationSnapshotRepository>;
  let mockPublisher: jest.Mocked<ConfirmationEventPublisher>;
  let mockContext: any;

  beforeEach(() => {
    // Create mocks
    mockRepository = {
      create: jest.fn(),
      getById: jest.fn(),
      listByReservation: jest.fn(),
      listByStaff: jest.fn(),
      listByFilter: jest.fn(),
    } as any;

    mockSnapshotRepo = {
      save: jest.fn(),
      getByReservationId: jest.fn(),
      listPendingCollections: jest.fn(),
      listPendingReturns: jest.fn(),
      updateStatus: jest.fn(),
    } as any;

    mockPublisher = {
      publish: jest.fn(),
    } as any;

    mockContext = {
      log: jest.fn(),
    };

    useCase = new ConfirmCollectionUseCase(
      mockRepository,
      mockPublisher,
      mockSnapshotRepo
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Successful Collection Confirmation", () => {
    it("should confirm collection with all required fields", async () => {
      const dto = {
        staffId: "staff-001",
        reservationId: "res-123",
        deviceId: "dev-456",
        notes: "Device in good condition",
      };

      const expectedAction: ConfirmationAction = {
        id: expect.any(String),
        staffId: dto.staffId,
        reservationId: dto.reservationId,
        deviceId: dto.deviceId,
        actionType: ConfirmationActionType.Collected,
        timestamp: expect.any(String),
        notes: dto.notes,
      };

      mockRepository.create.mockResolvedValue(expectedAction);
      mockSnapshotRepo.updateStatus.mockResolvedValue();
      mockPublisher.publish.mockResolvedValue();

      const result = await useCase.execute(dto, mockContext);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          staffId: dto.staffId,
          reservationId: dto.reservationId,
          deviceId: dto.deviceId,
          actionType: ConfirmationActionType.Collected,
        })
      );
      expect(mockSnapshotRepo.updateStatus).toHaveBeenCalledWith(dto.reservationId, "Collected");
      expect(mockSnapshotRepo.updateStatus).toHaveBeenCalledWith(dto.reservationId, "PendingReturn");
      expect(mockPublisher.publish).toHaveBeenCalledWith(
        {
          eventType: "Confirmation.Collected",
          data: expectedAction,
        },
        mockContext
      );
      expect(result).toEqual(expectedAction);
    });

    it("should confirm collection without optional notes", async () => {
      const dto = {
        staffId: "staff-002",
        reservationId: "res-456",
        deviceId: "dev-789",
      };

      const expectedAction: ConfirmationAction = {
        id: expect.any(String),
        staffId: dto.staffId,
        reservationId: dto.reservationId,
        deviceId: dto.deviceId,
        actionType: ConfirmationActionType.Collected,
        timestamp: expect.any(String),
      };

      mockRepository.create.mockResolvedValue(expectedAction);
      mockSnapshotRepo.updateStatus.mockResolvedValue();
      mockPublisher.publish.mockResolvedValue();

      const result = await useCase.execute(dto, mockContext);

      expect(result.notes).toBeUndefined();
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it("should generate unique ID for each action", async () => {
      const dto = {
        staffId: "staff-001",
        reservationId: "res-123",
        deviceId: "dev-456",
      };

      mockRepository.create.mockImplementation(async (action) => action);
      mockSnapshotRepo.updateStatus.mockResolvedValue();
      mockPublisher.publish.mockResolvedValue();

      const result1 = await useCase.execute(dto, mockContext);
      const result2 = await useCase.execute(dto, mockContext);

      expect(result1.id).not.toBe(result2.id);
    });

    it("should set timestamp to current time", async () => {
      const dto = {
        staffId: "staff-001",
        reservationId: "res-123",
        deviceId: "dev-456",
      };

      const beforeTime = new Date().getTime();
      
      mockRepository.create.mockImplementation(async (action) => action);
      mockSnapshotRepo.updateStatus.mockResolvedValue();
      mockPublisher.publish.mockResolvedValue();

      const result = await useCase.execute(dto, mockContext);
      
      const afterTime = new Date().getTime();
      const resultTime = new Date(result.timestamp).getTime();

      expect(resultTime).toBeGreaterThanOrEqual(beforeTime);
      expect(resultTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe("Validation Errors", () => {
    it("should throw error when staffId is missing", async () => {
      const dto = {
        staffId: "",
        reservationId: "res-123",
        deviceId: "dev-456",
      };

      await expect(useCase.execute(dto, mockContext)).rejects.toThrow(
        "staffId, reservationId, and deviceId are required."
      );

      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockPublisher.publish).not.toHaveBeenCalled();
    });

    it("should throw error when reservationId is missing", async () => {
      const dto = {
        staffId: "staff-001",
        reservationId: "",
        deviceId: "dev-456",
      };

      await expect(useCase.execute(dto, mockContext)).rejects.toThrow(
        "staffId, reservationId, and deviceId are required."
      );
    });

    it("should throw error when deviceId is missing", async () => {
      const dto = {
        staffId: "staff-001",
        reservationId: "res-123",
        deviceId: "",
      };

      await expect(useCase.execute(dto, mockContext)).rejects.toThrow(
        "staffId, reservationId, and deviceId are required."
      );
    });

    it("should throw error when all required fields are missing", async () => {
      const dto = {
        staffId: "",
        reservationId: "",
        deviceId: "",
      };

      await expect(useCase.execute(dto, mockContext)).rejects.toThrow(
        "staffId, reservationId, and deviceId are required."
      );
    });

    it("should throw error when staffId is null", async () => {
      const dto = {
        staffId: null as any,
        reservationId: "res-123",
        deviceId: "dev-456",
      };

      await expect(useCase.execute(dto, mockContext)).rejects.toThrow();
    });

    it("should throw error when reservationId is undefined", async () => {
      const dto = {
        staffId: "staff-001",
        reservationId: undefined as any,
        deviceId: "dev-456",
      };

      await expect(useCase.execute(dto, mockContext)).rejects.toThrow();
    });
  });

  describe("Repository Failures", () => {
    it("should handle repository create failure", async () => {
      const dto = {
        staffId: "staff-001",
        reservationId: "res-123",
        deviceId: "dev-456",
      };

      const error = new Error("Database connection failed");
      mockRepository.create.mockRejectedValue(error);

      await expect(useCase.execute(dto, mockContext)).rejects.toThrow(
        "Database connection failed"
      );

      expect(mockSnapshotRepo.updateStatus).not.toHaveBeenCalled();
      expect(mockPublisher.publish).not.toHaveBeenCalled();
    });

    it("should handle snapshot update failure", async () => {
      const dto = {
        staffId: "staff-001",
        reservationId: "res-123",
        deviceId: "dev-456",
      };

      const expectedAction: ConfirmationAction = {
        id: "action-123",
        staffId: dto.staffId,
        reservationId: dto.reservationId,
        deviceId: dto.deviceId,
        actionType: ConfirmationActionType.Collected,
        timestamp: new Date().toISOString(),
      };

      mockRepository.create.mockResolvedValue(expectedAction);
      mockSnapshotRepo.updateStatus.mockRejectedValue(
        new Error("Snapshot update failed")
      );

      await expect(useCase.execute(dto, mockContext)).rejects.toThrow(
        "Snapshot update failed"
      );

      expect(mockPublisher.publish).not.toHaveBeenCalled();
    });

    it("should handle event publishing failure", async () => {
      const dto = {
        staffId: "staff-001",
        reservationId: "res-123",
        deviceId: "dev-456",
      };

      const expectedAction: ConfirmationAction = {
        id: "action-123",
        staffId: dto.staffId,
        reservationId: dto.reservationId,
        deviceId: dto.deviceId,
        actionType: ConfirmationActionType.Collected,
        timestamp: new Date().toISOString(),
      };

      mockRepository.create.mockResolvedValue(expectedAction);
      mockSnapshotRepo.updateStatus.mockResolvedValue();
      mockPublisher.publish.mockRejectedValue(new Error("Event Grid unavailable"));

      await expect(useCase.execute(dto, mockContext)).rejects.toThrow(
        "Event Grid unavailable"
      );
    });
  });

  describe("Status Transition", () => {
    it("should update status to Collected then PendingReturn", async () => {
      const dto = {
        staffId: "staff-001",
        reservationId: "res-123",
        deviceId: "dev-456",
      };

      const expectedAction: ConfirmationAction = {
        id: "action-123",
        staffId: dto.staffId,
        reservationId: dto.reservationId,
        deviceId: dto.deviceId,
        actionType: ConfirmationActionType.Collected,
        timestamp: new Date().toISOString(),
      };

      mockRepository.create.mockResolvedValue(expectedAction);
      mockSnapshotRepo.updateStatus.mockResolvedValue();
      mockPublisher.publish.mockResolvedValue();

      await useCase.execute(dto, mockContext);

      expect(mockSnapshotRepo.updateStatus).toHaveBeenCalledTimes(2);
      expect(mockSnapshotRepo.updateStatus).toHaveBeenNthCalledWith(
        1,
        dto.reservationId,
        "Collected"
      );
      expect(mockSnapshotRepo.updateStatus).toHaveBeenNthCalledWith(
        2,
        dto.reservationId,
        "PendingReturn"
      );
    });
  });

  describe("Event Publishing", () => {
    it("should publish Confirmation.Collected event with correct data", async () => {
      const dto = {
        staffId: "staff-001",
        reservationId: "res-123",
        deviceId: "dev-456",
        notes: "All good",
      };

      const expectedAction: ConfirmationAction = {
        id: "action-123",
        staffId: dto.staffId,
        reservationId: dto.reservationId,
        deviceId: dto.deviceId,
        actionType: ConfirmationActionType.Collected,
        timestamp: new Date().toISOString(),
        notes: dto.notes,
      };

      mockRepository.create.mockResolvedValue(expectedAction);
      mockSnapshotRepo.updateStatus.mockResolvedValue();
      mockPublisher.publish.mockResolvedValue();

      await useCase.execute(dto, mockContext);

      expect(mockPublisher.publish).toHaveBeenCalledWith(
        {
          eventType: "Confirmation.Collected",
          data: expectedAction,
        },
        mockContext
      );
    });

    it("should log event publishing when context provided", async () => {
      const dto = {
        staffId: "staff-001",
        reservationId: "res-123",
        deviceId: "dev-456",
      };

      const expectedAction: ConfirmationAction = {
        id: "action-123",
        staffId: dto.staffId,
        reservationId: dto.reservationId,
        deviceId: dto.deviceId,
        actionType: ConfirmationActionType.Collected,
        timestamp: new Date().toISOString(),
      };

      mockRepository.create.mockResolvedValue(expectedAction);
      mockSnapshotRepo.updateStatus.mockResolvedValue();
      mockPublisher.publish.mockResolvedValue();

      await useCase.execute(dto, mockContext);

      expect(mockContext.log).toHaveBeenCalledWith(
        "📤 Publishing Confirmation.Collected event",
        { reservationId: dto.reservationId, deviceId: dto.deviceId }
      );
      expect(mockContext.log).toHaveBeenCalledWith(
        "✅ Confirmation.Collected event published successfully"
      );
    });
  });
});
