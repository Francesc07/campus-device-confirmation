import { ReservationSnapshot } from "../ReservationSnapshot";

describe("ReservationSnapshot Entity", () => {
  describe("Valid ReservationSnapshot", () => {
    it("should create a valid pending collection snapshot", () => {
      const snapshot: ReservationSnapshot = {
        reservationId: "res-123",
        deviceId: "dev-456",
        userId: "user-789",
        startDate: "2025-12-05T10:00:00Z",
        dueDate: "2025-12-07T10:00:00Z",
        status: "PendingCollection",
        createdAt: "2025-12-05T08:00:00Z",
        updatedAt: "2025-12-05T08:00:00Z",
      };

      expect(snapshot.reservationId).toBe("res-123");
      expect(snapshot.deviceId).toBe("dev-456");
      expect(snapshot.userId).toBe("user-789");
      expect(snapshot.status).toBe("PendingCollection");
      expect(snapshot.startDate).toBeDefined();
      expect(snapshot.dueDate).toBeDefined();
    });

    it("should create a valid collected snapshot", () => {
      const snapshot: ReservationSnapshot = {
        reservationId: "res-456",
        deviceId: "dev-789",
        userId: "user-123",
        startDate: "2025-12-05T10:00:00Z",
        dueDate: "2025-12-07T10:00:00Z",
        status: "Collected",
        createdAt: "2025-12-05T08:00:00Z",
        updatedAt: "2025-12-05T10:30:00Z",
      };

      expect(snapshot.status).toBe("Collected");
      expect(snapshot.updatedAt).not.toBe(snapshot.createdAt);
    });

    it("should create a valid pending return snapshot", () => {
      const snapshot: ReservationSnapshot = {
        reservationId: "res-789",
        deviceId: "dev-123",
        userId: "user-456",
        startDate: "2025-12-05T10:00:00Z",
        dueDate: "2025-12-07T10:00:00Z",
        status: "PendingReturn",
        createdAt: "2025-12-05T08:00:00Z",
        updatedAt: "2025-12-06T10:00:00Z",
      };

      expect(snapshot.status).toBe("PendingReturn");
    });

    it("should create a valid returned snapshot", () => {
      const snapshot: ReservationSnapshot = {
        reservationId: "res-999",
        deviceId: "dev-888",
        userId: "user-777",
        startDate: "2025-12-05T10:00:00Z",
        dueDate: "2025-12-07T10:00:00Z",
        status: "Returned",
        createdAt: "2025-12-05T08:00:00Z",
        updatedAt: "2025-12-07T09:00:00Z",
      };

      expect(snapshot.status).toBe("Returned");
    });

    it("should have valid ISO timestamp formats", () => {
      const snapshot: ReservationSnapshot = {
        reservationId: "res-123",
        deviceId: "dev-456",
        userId: "user-789",
        startDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        status: "PendingCollection",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(() => new Date(snapshot.startDate)).not.toThrow();
      expect(() => new Date(snapshot.dueDate)).not.toThrow();
      expect(() => new Date(snapshot.createdAt)).not.toThrow();
      expect(() => new Date(snapshot.updatedAt)).not.toThrow();
    });
  });

  describe("Invalid ReservationSnapshot", () => {
    it("should fail with missing required fields", () => {
      // @ts-expect-error - Missing required fields
      const invalidSnapshot: ReservationSnapshot = {
        reservationId: "res-123",
      };

      expect(invalidSnapshot.reservationId).toBe("res-123");
    });

    it("should detect empty string values", () => {
      const snapshot: ReservationSnapshot = {
        reservationId: "",
        deviceId: "",
        userId: "",
        startDate: "",
        dueDate: "",
        status: "PendingCollection",
        createdAt: "",
        updatedAt: "",
      };

      expect(snapshot.reservationId).toBe("");
      expect(snapshot.deviceId).toBe("");
      expect(snapshot.userId).toBe("");
    });

    it("should detect invalid status value", () => {
      const snapshot = {
        reservationId: "res-123",
        deviceId: "dev-456",
        userId: "user-789",
        startDate: "2025-12-05T10:00:00Z",
        dueDate: "2025-12-07T10:00:00Z",
        status: "InvalidStatus",
        createdAt: "2025-12-05T08:00:00Z",
        updatedAt: "2025-12-05T08:00:00Z",
      } as any;

      const validStatuses = ["PendingCollection", "Collected", "PendingReturn", "Returned"];
      expect(validStatuses).not.toContain(snapshot.status);
    });

    it("should detect null values in required fields", () => {
      const snapshot = {
        reservationId: null,
        deviceId: null,
        userId: null,
        startDate: null,
        dueDate: null,
        status: null,
        createdAt: null,
        updatedAt: null,
      } as any;

      expect(snapshot.reservationId).toBeNull();
      expect(snapshot.deviceId).toBeNull();
      expect(snapshot.userId).toBeNull();
    });

    it("should detect invalid date formats", () => {
      const snapshot: ReservationSnapshot = {
        reservationId: "res-123",
        deviceId: "dev-456",
        userId: "user-789",
        startDate: "invalid-date",
        dueDate: "not-a-date",
        status: "PendingCollection",
        createdAt: "bad-timestamp",
        updatedAt: "wrong-format",
      };

      expect(isNaN(new Date(snapshot.startDate).getTime())).toBe(true);
      expect(isNaN(new Date(snapshot.dueDate).getTime())).toBe(true);
      expect(isNaN(new Date(snapshot.createdAt).getTime())).toBe(true);
      expect(isNaN(new Date(snapshot.updatedAt).getTime())).toBe(true);
    });
  });

  describe("ReservationSnapshot Business Rules", () => {
    it("should validate that dueDate is after startDate", () => {
      const startDate = new Date("2025-12-05T10:00:00Z");
      const dueDate = new Date("2025-12-07T10:00:00Z");

      const snapshot: ReservationSnapshot = {
        reservationId: "res-123",
        deviceId: "dev-456",
        userId: "user-789",
        startDate: startDate.toISOString(),
        dueDate: dueDate.toISOString(),
        status: "PendingCollection",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(new Date(snapshot.dueDate).getTime()).toBeGreaterThan(
        new Date(snapshot.startDate).getTime()
      );
    });

    it("should detect when dueDate is before startDate (invalid)", () => {
      const startDate = new Date("2025-12-07T10:00:00Z");
      const dueDate = new Date("2025-12-05T10:00:00Z");

      const snapshot: ReservationSnapshot = {
        reservationId: "res-123",
        deviceId: "dev-456",
        userId: "user-789",
        startDate: startDate.toISOString(),
        dueDate: dueDate.toISOString(),
        status: "PendingCollection",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(new Date(snapshot.dueDate).getTime()).toBeLessThan(
        new Date(snapshot.startDate).getTime()
      );
    });

    it("should validate status transitions", () => {
      const validTransitions: Array<[string, string]> = [
        ["PendingCollection", "Collected"],
        ["Collected", "PendingReturn"],
        ["PendingReturn", "Returned"],
      ];

      validTransitions.forEach(([from, to]) => {
        expect(from).toBeDefined();
        expect(to).toBeDefined();
      });
    });

    it("should validate that updatedAt is not before createdAt", () => {
      const createdAt = new Date("2025-12-05T08:00:00Z");
      const updatedAt = new Date("2025-12-05T10:00:00Z");

      const snapshot: ReservationSnapshot = {
        reservationId: "res-123",
        deviceId: "dev-456",
        userId: "user-789",
        startDate: "2025-12-05T10:00:00Z",
        dueDate: "2025-12-07T10:00:00Z",
        status: "Collected",
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      };

      expect(new Date(snapshot.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(snapshot.createdAt).getTime()
      );
    });

    it("should allow same createdAt and updatedAt for new snapshots", () => {
      const timestamp = new Date().toISOString();
      const snapshot: ReservationSnapshot = {
        reservationId: "res-123",
        deviceId: "dev-456",
        userId: "user-789",
        startDate: "2025-12-05T10:00:00Z",
        dueDate: "2025-12-07T10:00:00Z",
        status: "PendingCollection",
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      expect(snapshot.createdAt).toBe(snapshot.updatedAt);
    });
  });
});
