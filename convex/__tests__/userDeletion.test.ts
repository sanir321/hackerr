import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";

// Mock dependencies
jest.mock("../_generated/server", () => ({
  internalMutation: jest.fn((config) => config),
}));
jest.mock("convex/values", () => ({
  v: {
    null: jest.fn(() => "null"),
    string: jest.fn(() => "string"),
  },
  ConvexError: class ConvexError extends Error {
    data: any;
    constructor(data: any) {
      super(typeof data === "string" ? data : data.message);
      this.data = data;
      this.name = "ConvexError";
    }
  },
}));
jest.mock("../_generated/api", () => ({
  api: {
    chats: {
      deleteAllChatsForUser: "deleteAllChatsForUser",
    },
  },
}));

const mockFileCountAggregate = {
  deleteIfExists: jest.fn().mockResolvedValue(undefined),
};

jest.mock("../fileAggregate", () => ({
  fileCountAggregate: mockFileCountAggregate,
}));

jest.mock("../lib/utils", () => ({
  validateServiceKey: jest.fn(),
}));

describe("userDeletion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("deleteAllUserData", () => {
    it("should delete Convex files and associated records", async () => {
      const { deleteAllUserData } = await import("../userDeletion");

      const mockDb = {
        query: jest.fn(),
        delete: jest.fn(),
        insert: jest.fn(),
      };

      const mockStorage = {
        delete: jest.fn(),
      };

      const mockCtx = {
        db: mockDb,
        storage: mockStorage,
        runMutation: jest.fn().mockResolvedValue(null),
      };

      const mockFiles = [
        {
          _id: "file1",
          storage_id: "storage123",
          user_id: "user123",
          name: "file1.txt",
          media_type: "text/plain",
          size: 500,
          file_token_size: 50,
          is_attached: true,
        },
      ];

      // Setup query mocks
      const mockQueryBuilder = {
        withIndex: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        collect: jest.fn(),
        unique: jest.fn(),
      };

      mockDb.query.mockReturnValue(mockQueryBuilder);

      // Mock query results in order of calls in implementation:
      // 1. orphaned files (Step 2)
      // 2. referral codes (Step 4)
      // 3. outgoing referrals (Step 5)
      // 4. usage logs (Step 7)
      // 5. extra usage (Step 8)
      mockQueryBuilder.collect
        .mockResolvedValueOnce(mockFiles) // orphaned files
        .mockResolvedValueOnce([]) // referral codes
        .mockResolvedValueOnce([]) // outgoing referrals
        .mockResolvedValueOnce([]) // usage logs
        .mockResolvedValueOnce([]); // extra usage

      // unique calls in order:
      // 1. customization (Step 3)
      // 2. incoming referral (Step 6)
      mockQueryBuilder.unique
        .mockResolvedValueOnce(null) // user_customization
        .mockResolvedValueOnce(null); // incoming referral

      await deleteAllUserData.handler(mockCtx, {
        serviceKey: "test-key",
        userId: "user123",
      });

      // Verify chat deletion was called
      expect(mockCtx.runMutation).toHaveBeenCalledWith("deleteAllChatsForUser", {
        serviceKey: "test-key",
        userId: "user123",
      });

      // Verify Convex storage file was deleted
      expect(mockStorage.delete).toHaveBeenCalledWith("storage123");

      // Verify file record was deleted
      expect(mockDb.delete).toHaveBeenCalledWith("file1");
    });
  });
});
