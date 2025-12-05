import { ConfirmReturnUseCase } from "../ConfirmReturnUseCase";
import { IConfirmationActionRepository } from "../../Interfaces/IConfirmationActionRepository";
import { IReservationSnapshotRepository } from "../../Interfaces/IReservationSnapshotRepository";
import { ConfirmationEventPublisher } from "../../../Infrastructure/EventGrid/ConfirmationEventPublisher";
import { ConfirmationActionType } from "../../../Domain/Enums/ConfirmationActionType";
import { ConfirmationAction } from "../../../Domain/Entities/ConfirmationAction";

describe("ConfirmReturnUseCase", () => {
  let useCase: ConfirmReturnUseCase;
  let mockRepository: jest.Mocked<IConfirmationActionRepository>;
  let mockSnapshotRepo: jest.Mocked<IReservationSnapshotRepository>;
  let mockPublisher: jest.Mocked<ConfirmationEventPublisher>;
  let mockContext: any;

  beforeEach(() => {
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

    useCase = new ConfirmReturnUseCase(
      mockRepository,
      mockPublisher,
      mockSnapshotRepo
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Successful Return Confirmation", () => {
    it("should confirm return with all required fields", async () => {
      const dto = {
        staffId: "staff-001",
        reservationId: "res-123",
        deviceId: "dev-456",
        notes: "Device returned in good condition",
      };

      const expectedAction: ConfirmationAction = {
        id: expect.any(String),
        staffId: dto.staffId,
        reservationId: dto.reservationId,
        deviceId: dto.deviceId,
        actionType: ConfirmationActionType.Returned,
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
          actionType: ConfirmationActionType.Returned,
        })
      );
      expect(mockSnapshotRepo.updateStatus).toHaveBeenCalledWith(dto.reservationId, "Returned");
      expect(mockPublisher.publish).toHaveBeenCalledWith(
        {
          eventType: "Confirmation.Returned",
          data: expectedAction,
        },
        mockContext
      );
      expect(result).toEqual(expectedAction);
    });

    it("should confirm return without optional notes", async () => {
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
        actionType: ConfirmationActionType.Returned,
        timestamp: expect.any(String),
      };

      mockRepository.create.mockResolvedValue(expectedAction);
      mockSnapshotRepo.updateStatus.mockResolvedValue();
      mockPublisher.publish.mockResolvedValue();

      const result = await useCase.execute(dto, mockContext);

      expect(result.notes).toBeUndefined();
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it("should handle device returned with damage notes", async () => {
      const dto = {
        staffId: "staff-001",
        reservationId: "res-123",
        deviceId: "dev-456",
        notes: "Minor scratch on screen, battery at 85%",
      };

      const expectedAction: ConfirmationAction = {
        id: "action-123",
        staffId: dto.staffId,
        reservationId: dto.reservationId,
        deviceId: dto.deviceId,
        actionType: ConfirmationActionType.Returned,
        timestamp: new Date().toISOString(),
        notes: dto.notes,
      };

      mockRepository.create.mockResolvedValue(expectedAction);
      mockSnapshotRepo.updateStatus.mockResolvedValue();
      mockPublisher.publish.mockResolvedValue();

      const result = await useCase.execute(dto, mockContext);

      expect(result.notes).toContain("scratch");
      expect(result.notes).toContain("battery");
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

    it("should throw error when all fields are null", async () => {
      const dto = {
        staffId: null as any,
        reservationId: null as any,
        deviceId: null as any,
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

      const error = new Error("Cosmos DB timeout");
      mockRepository.create.mockRejectedValue(error);

      await expect(useCase.execute(dto, mockContext)).rejects.toThrow("Cosmos DB timeout");

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
        actionType: ConfirmationActionType.Returned,
        timestamp: new Date().toISOString(),
      };

      mockRepository.create.mockResolvedValue(expectedAction);
      mockSnapshotRepo.updateStatus.mockRejectedValue(
        new Error("Snapshot not found")
      );

      await expect(useCase.execute(dto, mockContext)).rejects.toThrow("Snapshot not found");

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
        actionType: ConfirmationActionType.Returned,
        timestamp: new Date().toISOString(),
      };

      mockRepository.create.mockResolvedValue(expectedAction);
      mockSnapshotRepo.updateStatus.mockResolvedValue();
      mockPublisher.publish.mockRejectedValue(new Error("Event Grid error"));

      await expect(useCase.execute(dto, mockContext)).rejects.toThrow("Event Grid error");
    });
  });

  describe("Status Transition", () => {
    it("should update status to Returned (loan completed)", async () => {
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
        actionType: ConfirmationActionType.Returned,
        timestamp: new Date().toISOString(),
      };

      mockRepository.create.mockResolvedValue(expectedAction);
      mockSnapshotRepo.updateStatus.mockResolvedValue();
      mockPublisher.publish.mockResolvedValue();

      await useCase.execute(dto, mockContext);

      expect(mockSnapshotRepo.updateStatus).toHaveBeenCalledTimes(1);
      expect(mockSnapshotRepo.updateStatus).toHaveBeenCalledWith(
        dto.reservationId,
        "Returned"
      );
    });
  });

  describe("Event Publishing", () => {
    it("should publish Confirmation.Returned event with correct data", async () => {
      const dto = {
        staffId: "staff-001",
        reservationId: "res-123",
        deviceId: "dev-456",
        notes: "Device intact",
      };

      const expectedAction: ConfirmationAction = {
        id: "action-123",
        staffId: dto.staffId,
        reservationId: dto.reservationId,
        deviceId: dto.deviceId,
        actionType: ConfirmationActionType.Returned,
        timestamp: new Date().toISOString(),
        notes: dto.notes,
      };

      mockRepository.create.mockResolvedValue(expectedAction);
      mockSnapshotRepo.updateStatus.mockResolvedValue();
      mockPublisher.publish.mockResolvedValue();

      await useCase.execute(dto, mockContext);

      expect(mockPublisher.publish).toHaveBeenCalledWith(
        {
          eventType: "Confirmation.Returned",
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
        actionType: ConfirmationActionType.Returned,
        timestamp: new Date().toISOString(),
      };

      mockRepository.create.mockResolvedValue(expectedAction);
      mockSnapshotRepo.updateStatus.mockResolvedValue();
      mockPublisher.publish.mockResolvedValue();

      await useCase.execute(dto, mockContext);

      expect(mockContext.log).toHaveBeenCalledWith(
        "📤 Publishing Confirmation.Returned event",
        { reservationId: dto.reservationId, deviceId: dto.deviceId }
      );
      expect(mockContext.log).toHaveBeenCalledWith(
        "✅ Confirmation.Returned event published successfully"
      );
    });
  });

  describe("Complete Loan Lifecycle", () => {
    it("should mark loan as completed when device is returned", async () => {
      const dto = {
        staffId: "staff-001",
        reservationId: "res-123",
        deviceId: "dev-456",
        notes: "Loan completed successfully",
      };

      const expectedAction: ConfirmationAction = {
        id: "action-123",
        staffId: dto.staffId,
        reservationId: dto.reservationId,
        deviceId: dto.deviceId,
        actionType: ConfirmationActionType.Returned,
        timestamp: new Date().toISOString(),
        notes: dto.notes,
      };

      mockRepository.create.mockResolvedValue(expectedAction);
      mockSnapshotRepo.updateStatus.mockResolvedValue();
      mockPublisher.publish.mockResolvedValue();

      const result = await useCase.execute(dto, mockContext);

      expect(result.actionType).toBe(ConfirmationActionType.Returned);
      expect(mockSnapshotRepo.updateStatus).toHaveBeenCalledWith(dto.reservationId, "Returned");
    });
  });
});
