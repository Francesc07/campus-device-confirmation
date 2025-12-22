import { ConfirmationAction } from "../../../Domain/Entities/ConfirmationAction";
import { ReservationSnapshot } from "../../../Domain/Entities/ReservationSnapshot";
import { ConfirmationActionType } from "../../../Domain/Enums/ConfirmationActionType";
import { randomUUID } from "crypto";

/**
 * Integration tests for Cosmos DB repositories
 * These tests use real Cosmos DB connections and are SKIPPED in CI
 * 
 * To run integration tests locally:
 * 1. Ensure environment variables are set (AUTH0_DOMAIN, AUTH0_AUDIENCE, COSMOS_DB_*, etc.)
 * 2. Remove .skip from describe.skip below
 * 3. Run: npm test -- CosmosRepositories.integration.test.ts
 * 
 * These tests are skipped by default to prevent CI failures when environment variables aren't available.
 */
const shouldRunIntegrationTests = process.env.INTEGRATION_TEST === "true";

describe.skip("Cosmos DB Integration Tests", () => {
  let confirmationRepo: any;
  let snapshotRepo: any;

  beforeAll(async () => {
    if (!shouldRunIntegrationTests) {
      console.log("Skipping integration tests. Set INTEGRATION_TEST=true to run.");
      return;
    }

    // Dynamically import repositories only when needed to avoid environment variable errors
    const { CosmosConfirmationActionRepository } = await import("../CosmosConfirmationActionRepository");
    const { CosmosReservationSnapshotRepository } = await import("../CosmosReservationSnapshotRepository");
    
    confirmationRepo = new CosmosConfirmationActionRepository();
    snapshotRepo = new CosmosReservationSnapshotRepository();
  });

  describe("ConfirmationActionRepository Integration", () => {
    let testReservationId: string;
    let testDeviceId: string;
    let testAction: ConfirmationAction;

    beforeEach(() => {
      testReservationId = `int-test-res-${randomUUID()}`;
      testDeviceId = `int-test-dev-${randomUUID()}`;
    });

    it("should create and retrieve a confirmation action", async () => {
      if (!shouldRunIntegrationTests) return;

      const action: ConfirmationAction = {
        id: randomUUID(),
        staffId: "int-test-staff-001",
        reservationId: testReservationId,
        deviceId: testDeviceId,
        actionType: ConfirmationActionType.Collected,
        timestamp: new Date().toISOString(),
        notes: "Integration test action",
      };

      const created = await confirmationRepo.create(action);
      expect(created.id).toBe(action.id);

      const retrieved = await confirmationRepo.findById(action.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.reservationId).toBe(testReservationId);
    });

    it("should list actions by reservation", async () => {
      if (!shouldRunIntegrationTests) return;

      const action1: ConfirmationAction = {
        id: randomUUID(),
        staffId: "int-test-staff-001",
        reservationId: testReservationId,
        deviceId: testDeviceId,
        actionType: ConfirmationActionType.Collected,
        timestamp: new Date().toISOString(),
      };

      const action2: ConfirmationAction = {
        id: randomUUID(),
        staffId: "int-test-staff-002",
        reservationId: testReservationId,
        deviceId: testDeviceId,
        actionType: ConfirmationActionType.Returned,
        timestamp: new Date(Date.now() + 1000).toISOString(),
      };

      await confirmationRepo.create(action1);
      await confirmationRepo.create(action2);

      const actions = await confirmationRepo.findByReservationId(testReservationId);
      expect(actions.length).toBeGreaterThanOrEqual(2);
      expect(actions.some(a => a.id === action1.id)).toBe(true);
      expect(actions.some(a => a.id === action2.id)).toBe(true);
    });

    it("should handle concurrent writes without data loss", async () => {
      if (!shouldRunIntegrationTests) return;

      const promises = Array.from({ length: 5 }, (_, i) => {
        const action: ConfirmationAction = {
          id: randomUUID(),
          staffId: `int-test-staff-${i}`,
          reservationId: testReservationId,
          deviceId: testDeviceId,
          actionType: ConfirmationActionType.Collected,
          timestamp: new Date().toISOString(),
        };
        return confirmationRepo.create(action);
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      
      const allActions = await confirmationRepo.findByReservationId(testReservationId);
      expect(allActions.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("ReservationSnapshotRepository Integration", () => {
    let testReservationId: string;
    let testSnapshot: ReservationSnapshot;

    beforeEach(() => {
      testReservationId = `int-test-res-${randomUUID()}`;
    });

    it("should save and retrieve a reservation snapshot", async () => {
      if (!shouldRunIntegrationTests) return;

      const snapshot: ReservationSnapshot = {
        reservationId: testReservationId,
        deviceId: `int-test-dev-${randomUUID()}`,
        userId: "int-test-user-001",
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        status: "PendingCollection",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await snapshotRepo.save(snapshot);

      const retrieved = await snapshotRepo.getByReservationId(testReservationId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.deviceId).toBe(snapshot.deviceId);
      expect(retrieved?.status).toBe("PendingCollection");
    });

    it("should update snapshot status", async () => {
      if (!shouldRunIntegrationTests) return;

      const snapshot: ReservationSnapshot = {
        reservationId: testReservationId,
        deviceId: `int-test-dev-${randomUUID()}`,
        userId: "int-test-user-002",
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        status: "PendingCollection",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await snapshotRepo.save(snapshot);

      await snapshotRepo.updateStatus(testReservationId, "Collected");
      const collected = await snapshotRepo.getByReservationId(testReservationId);
      expect(collected?.status).toBe("Collected");

      await snapshotRepo.updateStatus(testReservationId, "PendingReturn");
      const pendingReturn = await snapshotRepo.getByReservationId(testReservationId);
      expect(pendingReturn?.status).toBe("PendingReturn");

      await snapshotRepo.updateStatus(testReservationId, "Returned");
      const returned = await snapshotRepo.getByReservationId(testReservationId);
      expect(returned?.status).toBe("Returned");
    });

    it("should list snapshots by status", async () => {
      if (!shouldRunIntegrationTests) return;

      const snapshot1: ReservationSnapshot = {
        reservationId: `${testReservationId}-1`,
        deviceId: `int-test-dev-${randomUUID()}`,
        userId: "int-test-user-003",
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        status: "PendingCollection",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const snapshot2: ReservationSnapshot = {
        reservationId: `${testReservationId}-2`,
        deviceId: `int-test-dev-${randomUUID()}`,
        userId: "int-test-user-004",
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        status: "PendingReturn",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await snapshotRepo.save(snapshot1);
      await snapshotRepo.save(snapshot2);

      const pendingCollections = await snapshotRepo.listPendingCollections();
      expect(pendingCollections.some(s => s.reservationId === snapshot1.reservationId)).toBe(true);

      const pendingReturns = await snapshotRepo.listPendingReturns();
      expect(pendingReturns.some(s => s.reservationId === snapshot2.reservationId)).toBe(true);
    });

    it("should handle concurrent status updates", async () => {
      if (!shouldRunIntegrationTests) return;

      const snapshot: ReservationSnapshot = {
        reservationId: testReservationId,
        deviceId: `int-test-dev-${randomUUID()}`,
        userId: "int-test-user-005",
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        status: "PendingCollection",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await snapshotRepo.save(snapshot);

      // Attempt concurrent updates (should handle gracefully)
      const updates = [
        snapshotRepo.updateStatus(testReservationId, "Collected"),
        snapshotRepo.updateStatus(testReservationId, "Collected"),
        snapshotRepo.updateStatus(testReservationId, "Collected"),
      ];

      await Promise.all(updates);

      const final = await snapshotRepo.getByReservationId(testReservationId);
      expect(final?.status).toBe("Collected");
    });
  });

  describe("End-to-End Integration Scenarios", () => {
    it("should handle complete loan lifecycle", async () => {
      if (!shouldRunIntegrationTests) return;

      const reservationId = `int-test-lifecycle-${randomUUID()}`;
      const deviceId = `int-test-dev-${randomUUID()}`;

      // Step 1: Create reservation snapshot
      const snapshot: ReservationSnapshot = {
        reservationId,
        deviceId,
        userId: "int-test-user-lifecycle",
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        status: "PendingCollection",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await snapshotRepo.save(snapshot);

      // Step 2: Confirm collection
      const collectionAction: ConfirmationAction = {
        id: randomUUID(),
        staffId: "int-test-staff-lifecycle",
        reservationId,
        deviceId,
        actionType: ConfirmationActionType.Collected,
        timestamp: new Date().toISOString(),
      };
      await confirmationRepo.create(collectionAction);
      await snapshotRepo.updateStatus(reservationId, "Collected");
      await snapshotRepo.updateStatus(reservationId, "PendingReturn");

      // Step 3: Confirm return
      const returnAction: ConfirmationAction = {
        id: randomUUID(),
        staffId: "int-test-staff-lifecycle",
        reservationId,
        deviceId,
        actionType: ConfirmationActionType.Returned,
        timestamp: new Date().toISOString(),
      };
      await confirmationRepo.create(returnAction);
      await snapshotRepo.updateStatus(reservationId, "Returned");

      // Verify final state
      const finalSnapshot = await snapshotRepo.getByReservationId(reservationId);
      expect(finalSnapshot?.status).toBe("Returned");

      const actions = await confirmationRepo.findByReservationId(reservationId);
      expect(actions).toHaveLength(2);
      expect(actions.some(a => a.actionType === ConfirmationActionType.Collected)).toBe(true);
      expect(actions.some(a => a.actionType === ConfirmationActionType.Returned)).toBe(true);
    });
  });
});
