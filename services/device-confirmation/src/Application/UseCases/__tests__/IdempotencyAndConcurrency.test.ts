import { ConfirmCollectionUseCase } from "../ConfirmCollectionUseCase";
import { ConfirmReturnUseCase } from "../ConfirmReturnUseCase";
import { IConfirmationActionRepository } from "../../Interfaces/IConfirmationActionRepository";
import { IReservationSnapshotRepository } from "../../Interfaces/IReservationSnapshotRepository";
import { ConfirmationEventPublisher } from "../../../Infrastructure/EventGrid/ConfirmationEventPublisher";
import { ConfirmationActionType } from "../../../Domain/Enums/ConfirmationActionType";
import { ConfirmationAction } from "../../../Domain/Entities/ConfirmationAction";

describe("Idempotency and Concurrency Tests", () => {
  let confirmCollectionUseCase: ConfirmCollectionUseCase;
  let confirmReturnUseCase: ConfirmReturnUseCase;
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
      findByReservationId: jest.fn(),
    } as any;

    mockSnapshotRepo = {
      save: jest.fn(),
      getByReservationId: jest.fn(),
      listPendingCollections: jest.fn(),
      listPendingReturns: jest.fn(),
      listCollected: jest.fn(),
      listReturned: jest.fn(),
      listAll: jest.fn(),
      updateStatus: jest.fn(),
    } as any;

    mockPublisher = {
      publish: jest.fn(),
    } as any;

    mockContext = {
      log: jest.fn(),
    };

    confirmCollectionUseCase = new ConfirmCollectionUseCase(
      mockRepository,
      mockPublisher,
      mockSnapshotRepo
    );

    confirmReturnUseCase = new ConfirmReturnUseCase(
      mockRepository,
      mockPublisher,
      mockSnapshotRepo
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Idempotency - Duplicate Request Handling", () => {
    describe("Collection Confirmation Idempotency", () => {
      it("should be idempotent - return existing result when collection already confirmed", async () => {
        const dto = {
          staffId: "staff-001",
          reservationId: "res-123",
          deviceId: "dev-456",
        };

        const existingAction: ConfirmationAction = {
          id: "existing-action-123",
          staffId: dto.staffId,
          reservationId: dto.reservationId,
          deviceId: dto.deviceId,
          actionType: ConfirmationActionType.Collected,
          timestamp: "2025-12-08T10:00:00Z",
        };

        // Mock: Collection already confirmed
        mockRepository.findByReservationId.mockResolvedValue([existingAction]);

        const result = await confirmCollectionUseCase.execute(dto, mockContext);

        // Should return existing action, not create new one
        expect(result).toEqual(existingAction);
        expect(mockRepository.create).not.toHaveBeenCalled();
        expect(mockSnapshotRepo.updateStatus).not.toHaveBeenCalled();
        expect(mockPublisher.publish).not.toHaveBeenCalled();
        expect(mockContext.log).toHaveBeenCalledWith(
          expect.stringMatching(/Collection already confirmed/i),
          expect.anything()
        );
      });

      it("should allow different device collection on same reservation", async () => {
        const dto = {
          staffId: "staff-001",
          reservationId: "res-123",
          deviceId: "dev-999", // Different device
        };

        const existingAction: ConfirmationAction = {
          id: "existing-action-123",
          staffId: "staff-002",
          reservationId: dto.reservationId,
          deviceId: "dev-456", // Different device already collected
          actionType: ConfirmationActionType.Collected,
          timestamp: "2025-12-08T10:00:00Z",
        };

        const newAction: ConfirmationAction = {
          id: "new-action-456",
          staffId: dto.staffId,
          reservationId: dto.reservationId,
          deviceId: dto.deviceId,
          actionType: ConfirmationActionType.Collected,
          timestamp: new Date().toISOString(),
        };

        mockRepository.findByReservationId.mockResolvedValue([existingAction]);
        mockRepository.create.mockResolvedValue(newAction);
        mockSnapshotRepo.updateStatus.mockResolvedValue();
        mockPublisher.publish.mockResolvedValue();

        const result = await confirmCollectionUseCase.execute(dto, mockContext);

        expect(result).toEqual(newAction);
        expect(mockRepository.create).toHaveBeenCalled();
      });

      it("should handle multiple duplicate requests within short time window", async () => {
        const dto = {
          staffId: "staff-001",
          reservationId: "res-123",
          deviceId: "dev-456",
        };

        const existingAction: ConfirmationAction = {
          id: "action-123",
          staffId: dto.staffId,
          reservationId: dto.reservationId,
          deviceId: dto.deviceId,
          actionType: ConfirmationActionType.Collected,
          timestamp: new Date().toISOString(),
        };

        mockRepository.findByReservationId.mockResolvedValue([existingAction]);

        // Simulate 5 rapid duplicate requests
        const requests = Array(5).fill(null).map(() =>
          confirmCollectionUseCase.execute(dto, mockContext)
        );

        const results = await Promise.all(requests);

        // All should return same result
        results.forEach((result) => {
          expect(result).toEqual(existingAction);
        });

        // Create should never be called
        expect(mockRepository.create).not.toHaveBeenCalled();
        expect(mockRepository.findByReservationId).toHaveBeenCalledTimes(5);
      });
    });

    describe("Return Confirmation Idempotency", () => {
      it("should be idempotent - return existing result when return already confirmed", async () => {
        const dto = {
          staffId: "staff-001",
          reservationId: "res-123",
          deviceId: "dev-456",
        };

        const existingAction: ConfirmationAction = {
          id: "existing-return-123",
          staffId: dto.staffId,
          reservationId: dto.reservationId,
          deviceId: dto.deviceId,
          actionType: ConfirmationActionType.Returned,
          timestamp: "2025-12-08T11:00:00Z",
        };

        mockRepository.findByReservationId.mockResolvedValue([existingAction]);

        const result = await confirmReturnUseCase.execute(dto, mockContext);

        expect(result).toEqual(existingAction);
        expect(mockRepository.create).not.toHaveBeenCalled();
        expect(mockSnapshotRepo.updateStatus).not.toHaveBeenCalled();
        expect(mockPublisher.publish).not.toHaveBeenCalled();
      });

      it("should prevent return before collection", async () => {
        const dto = {
          staffId: "staff-001",
          reservationId: "res-123",
          deviceId: "dev-456",
        };

        // No existing actions - device not collected yet
        mockRepository.findByReservationId.mockResolvedValue([]);

        await expect(confirmReturnUseCase.execute(dto, mockContext)).rejects.toThrow(
          "Cannot confirm return: device has not been collected yet"
        );

        expect(mockRepository.create).not.toHaveBeenCalled();
      });

      it("should allow return only after collection is confirmed", async () => {
        const dto = {
          staffId: "staff-001",
          reservationId: "res-123",
          deviceId: "dev-456",
        };

        const collectedAction: ConfirmationAction = {
          id: "collected-123",
          staffId: dto.staffId,
          reservationId: dto.reservationId,
          deviceId: dto.deviceId,
          actionType: ConfirmationActionType.Collected,
          timestamp: "2025-12-08T10:00:00Z",
        };

        const returnAction: ConfirmationAction = {
          id: "return-456",
          staffId: dto.staffId,
          reservationId: dto.reservationId,
          deviceId: dto.deviceId,
          actionType: ConfirmationActionType.Returned,
          timestamp: new Date().toISOString(),
        };

        mockRepository.findByReservationId.mockResolvedValue([collectedAction]);
        mockRepository.create.mockResolvedValue(returnAction);
        mockSnapshotRepo.updateStatus.mockResolvedValue();
        mockPublisher.publish.mockResolvedValue();

        const result = await confirmReturnUseCase.execute(dto, mockContext);

        expect(result).toEqual(returnAction);
        expect(mockRepository.create).toHaveBeenCalled();
      });
    });
  });

  describe("Concurrency - Race Condition Handling", () => {
    it("should handle concurrent collection confirmations for same reservation", async () => {
      const dto = {
        staffId: "staff-001",
        reservationId: "res-123",
        deviceId: "dev-456",
      };

      const action: ConfirmationAction = {
        id: "action-123",
        staffId: dto.staffId,
        reservationId: dto.reservationId,
        deviceId: dto.deviceId,
        actionType: ConfirmationActionType.Collected,
        timestamp: new Date().toISOString(),
      };

      let callCount = 0;
      mockRepository.findByReservationId.mockImplementation(async () => {
        callCount++;
        // First call: no existing action
        // Subsequent calls: action exists (simulating concurrent creation)
        return callCount === 1 ? [] : [action];
      });

      mockRepository.create.mockResolvedValue(action);
      mockSnapshotRepo.updateStatus.mockResolvedValue();
      mockPublisher.publish.mockResolvedValue();

      // Simulate 3 concurrent requests
      const requests = [
        confirmCollectionUseCase.execute(dto, mockContext),
        confirmCollectionUseCase.execute(dto, mockContext),
        confirmCollectionUseCase.execute(dto, mockContext),
      ];

      const results = await Promise.all(requests);

      // At least one should succeed, others should be idempotent
      expect(results.every((r) => r.id === action.id)).toBe(true);

      // Create should be called maximum once (first request wins)
      expect(mockRepository.create).toHaveBeenCalledTimes(1);
    });

    it("should handle concurrent collection and return attempts", async () => {
      const dto = {
        staffId: "staff-001",
        reservationId: "res-123",
        deviceId: "dev-456",
      };

      const collectedAction: ConfirmationAction = {
        id: "collected-123",
        staffId: dto.staffId,
        reservationId: dto.reservationId,
        deviceId: dto.deviceId,
        actionType: ConfirmationActionType.Collected,
        timestamp: "2025-12-08T10:00:00Z",
      };

      // Collection attempt should succeed
      mockRepository.findByReservationId.mockResolvedValueOnce([]);
      mockRepository.create.mockResolvedValueOnce(collectedAction);
      mockSnapshotRepo.updateStatus.mockResolvedValue();
      mockPublisher.publish.mockResolvedValue();

      const collectionPromise = confirmCollectionUseCase.execute(dto, mockContext);

      // Return attempt should fail (no collection yet)
      mockRepository.findByReservationId.mockResolvedValueOnce([]);
      
      const returnPromise = confirmReturnUseCase.execute(dto, mockContext);

      const [collectionResult, returnResult] = await Promise.allSettled([
        collectionPromise,
        returnPromise,
      ]);

      expect(collectionResult.status).toBe("fulfilled");
      expect(returnResult.status).toBe("rejected");
      if (returnResult.status === "rejected") {
        expect(returnResult.reason.message).toContain("not been collected");
      }
    });

    it("should handle status update race conditions with snapshot", async () => {
      const dto = {
        staffId: "staff-001",
        reservationId: "res-123",
        deviceId: "dev-456",
      };

      const action: ConfirmationAction = {
        id: "action-123",
        staffId: dto.staffId,
        reservationId: dto.reservationId,
        deviceId: dto.deviceId,
        actionType: ConfirmationActionType.Collected,
        timestamp: new Date().toISOString(),
      };

      mockRepository.findByReservationId.mockResolvedValue([]);
      mockRepository.create.mockResolvedValue(action);
      mockPublisher.publish.mockResolvedValue();

      // Simulate concurrent status updates
      let updateCount = 0;
      mockSnapshotRepo.updateStatus.mockImplementation(async () => {
        updateCount++;
        await new Promise((resolve) => setTimeout(resolve, 10)); // Simulate delay
      });

      await confirmCollectionUseCase.execute(dto, mockContext);

      // Both status updates should complete
      expect(mockSnapshotRepo.updateStatus).toHaveBeenCalledTimes(2);
      expect(mockSnapshotRepo.updateStatus).toHaveBeenCalledWith(
        dto.reservationId,
        "Collected"
      );
      expect(mockSnapshotRepo.updateStatus).toHaveBeenCalledWith(
        dto.reservationId,
        "PendingReturn"
      );
    });
  });

  describe("Retry and Error Recovery", () => {
    it("should retry on transient database failures", async () => {
      const dto = {
        staffId: "staff-001",
        reservationId: "res-123",
        deviceId: "dev-456",
      };

      const action: ConfirmationAction = {
        id: "action-123",
        staffId: dto.staffId,
        reservationId: dto.reservationId,
        deviceId: dto.deviceId,
        actionType: ConfirmationActionType.Collected,
        timestamp: new Date().toISOString(),
      };

      mockRepository.findByReservationId.mockResolvedValue([]);
      
      // Fail first time, succeed second time
      mockRepository.create
        .mockRejectedValueOnce(new Error("Timeout"))
        .mockResolvedValueOnce(action);

      // Should throw on first attempt (no automatic retry in this implementation)
      await expect(confirmCollectionUseCase.execute(dto, mockContext)).rejects.toThrow(
        "Timeout"
      );

      // Manual retry should succeed
      mockRepository.create.mockResolvedValue(action);
      mockSnapshotRepo.updateStatus.mockResolvedValue();
      mockPublisher.publish.mockResolvedValue();

      const result = await confirmCollectionUseCase.execute(dto, mockContext);
      expect(result).toEqual(action);
    });

    it("should maintain consistency if event publishing fails", async () => {
      const dto = {
        staffId: "staff-001",
        reservationId: "res-123",
        deviceId: "dev-456",
      };

      const action: ConfirmationAction = {
        id: "action-123",
        staffId: dto.staffId,
        reservationId: dto.reservationId,
        deviceId: dto.deviceId,
        actionType: ConfirmationActionType.Collected,
        timestamp: new Date().toISOString(),
      };

      mockRepository.findByReservationId.mockResolvedValue([]);
      mockRepository.create.mockResolvedValue(action);
      mockSnapshotRepo.updateStatus.mockResolvedValue();
      mockPublisher.publish.mockRejectedValue(new Error("Event Grid unavailable"));

      await expect(confirmCollectionUseCase.execute(dto, mockContext)).rejects.toThrow(
        "Event Grid unavailable"
      );

      // Database operations should have completed
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockSnapshotRepo.updateStatus).toHaveBeenCalledTimes(2);
    });
  });

  describe("Edge Cases and Data Integrity", () => {
    it("should handle empty reservationId gracefully", async () => {
      const dto = {
        staffId: "staff-001",
        reservationId: "",
        deviceId: "dev-456",
      };

      await expect(confirmCollectionUseCase.execute(dto, mockContext)).rejects.toThrow(
        "required"
      );

      expect(mockRepository.findByReservationId).not.toHaveBeenCalled();
    });

    it("should handle null deviceId gracefully", async () => {
      const dto = {
        staffId: "staff-001",
        reservationId: "res-123",
        deviceId: null as any,
      };

      await expect(confirmCollectionUseCase.execute(dto, mockContext)).rejects.toThrow();
    });

    it("should verify timestamp ordering (collection before return)", async () => {
      const dto = {
        staffId: "staff-001",
        reservationId: "res-123",
        deviceId: "dev-456",
      };

      const collectionTime = "2025-12-08T10:00:00Z";
      const collectedAction: ConfirmationAction = {
        id: "collected-123",
        staffId: dto.staffId,
        reservationId: dto.reservationId,
        deviceId: dto.deviceId,
        actionType: ConfirmationActionType.Collected,
        timestamp: collectionTime,
      };

      const returnAction: ConfirmationAction = {
        id: "return-456",
        staffId: dto.staffId,
        reservationId: dto.reservationId,
        deviceId: dto.deviceId,
        actionType: ConfirmationActionType.Returned,
        timestamp: new Date().toISOString(),
      };

      mockRepository.findByReservationId.mockResolvedValue([collectedAction]);
      mockRepository.create.mockResolvedValue(returnAction);
      mockSnapshotRepo.updateStatus.mockResolvedValue();
      mockPublisher.publish.mockResolvedValue();

      const result = await confirmReturnUseCase.execute(dto, mockContext);

      // Return timestamp should be after collection
      expect(new Date(result.timestamp).getTime()).toBeGreaterThan(
        new Date(collectionTime).getTime()
      );
    });
  });
});
