jest.mock("server-only", () => ({}), { virtual: true });

jest.mock("@/lib/db/convex-client", () => ({
  getConvexClient: jest.fn(),
}));

jest.mock("@/convex/_generated/api", () => ({
  api: {
    fileActions: {
      generateUploadUrl: "fileActions:generateUploadUrl",
      saveSandboxGeneratedFile: "fileActions:saveSandboxGeneratedFile",
    },
  },
}));

import { getConvexClient } from "@/lib/db/convex-client";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_GENERATED_FILE_SIZE_BYTES,
} from "@/lib/constants/s3";
import { uploadSandboxFileToConvex } from "../sandbox-file-uploader";

const mockGetConvexClient = getConvexClient as jest.MockedFunction<
  typeof getConvexClient
>;
let mockConvexAction: jest.Mock;
let consoleWarnSpy: jest.SpyInstance;
let consoleErrorSpy: jest.SpyInstance;

function makeSandbox(size: number, e2b = false, windows = false) {
  return {
    isWindows: jest.fn(() => windows),
    commands: {
      run: jest.fn(async (command: string) => {
        if (command.includes("stat -c%s")) {
          return { stdout: String(size), stderr: "", exitCode: 0 };
        }
        if (command.startsWith("for %I")) {
          return { stdout: String(size), stderr: "", exitCode: 0 };
        }
        if (command.includes("curl -s -f -X POST")) {
          // Success case for curl: output the JSON storageId followed by status marker
          return {
            stdout: `{"storageId": "storage_123"}\n__UMBRAA_UPLOAD_EXIT_CODE__:0`,
            stderr: "",
            exitCode: 0,
          };
        }
        return { stdout: "", stderr: "unexpected command", exitCode: 1 };
      }),
    },
    files: {
      uploadToUrl: jest.fn(async () => undefined),
    },
    downloadUrl: jest.fn(async () => "https://sandbox.example/file"),
  };
}

describe("uploadSandboxFileToConvex", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://convex.example";
    process.env.CONVEX_SERVICE_ROLE_KEY = "service-key";

    mockConvexAction = jest.fn(async (action: any) => {
      if (action === "fileActions:generateUploadUrl") {
        return "https://convex.example/upload-url";
      }
      if (action === "fileActions:saveSandboxGeneratedFile") {
        return {
          url: "https://convex.example/download-url",
          fileId: "file_123",
          tokens: 0,
        };
      }
      return {};
    });

    mockGetConvexClient.mockReturnValue({
      action: mockConvexAction,
    } as any);
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test("rejects oversized generated files before uploading to storage", async () => {
    const sandbox = makeSandbox(MAX_GENERATED_FILE_SIZE_BYTES + 1);

    await expect(
      uploadSandboxFileToConvex({
        sandbox: sandbox as any,
        userId: "u1",
        fullPath: "/home/user/large.tar.gz",
      }),
    ).rejects.toThrow(/exceeds the maximum generated file size limit/);

    expect(mockConvexAction).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('"event":"sandbox_generated_file_too_large"'),
    );
  });

  test("rejects oversized E2B files before uploading", async () => {
    const sandbox = makeSandbox(MAX_GENERATED_FILE_SIZE_BYTES + 1, true);

    await expect(
      uploadSandboxFileToConvex({
        sandbox: sandbox as any,
        userId: "u1",
        fullPath: "/home/user/large.tar.gz",
      }),
    ).rejects.toThrow(/exceeds the maximum generated file size limit/);

    expect(sandbox.commands.run).toHaveBeenCalledTimes(1);
    expect(mockConvexAction).not.toHaveBeenCalled();
  });

  test("allows generated artifacts above the user upload limit", async () => {
    const sandbox = makeSandbox(MAX_FILE_SIZE_BYTES + 1);

    await uploadSandboxFileToConvex({
      sandbox: sandbox as any,
      userId: "u1",
      fullPath: "/home/user/archive.tar.gz",
    });

    expect(mockConvexAction).toHaveBeenCalledWith(
      "fileActions:saveSandboxGeneratedFile",
      expect.objectContaining({
        name: "archive.tar.gz",
        size: MAX_FILE_SIZE_BYTES + 1,
      }),
    );
  });

  test("uploads allowed generated files using the preflight size", async () => {
    const sandbox = makeSandbox(1234);

    const saved = await uploadSandboxFileToConvex({
      sandbox: sandbox as any,
      userId: "u1",
      fullPath: "/home/user/report.txt",
    });

    expect(sandbox.commands.run).toHaveBeenCalledWith(
      expect.stringContaining("curl -s -f -X POST -H 'Content-Type: application/octet-stream'"),
      expect.objectContaining({
        timeoutMs: expect.any(Number),
      }),
    );

    expect(mockConvexAction).toHaveBeenCalledWith(
      "fileActions:saveSandboxGeneratedFile",
      expect.objectContaining({
        name: "report.txt",
        size: 1234,
        storageId: "storage_123",
      }),
    );
    expect(saved).toMatchObject({
      name: "report.txt",
      storageId: "storage_123",
    });
  });

  test("reports command upload stderr instead of a bare exit status", async () => {
    const sandbox = makeSandbox(1234, true);
    (sandbox.commands.run as jest.Mock).mockImplementation(
      async (command: string) => {
        if (command.includes("stat -c%s")) {
          return { stdout: "1234", stderr: "", exitCode: 0 };
        }
        if (command.includes("curl -s -f -X POST")) {
          return {
            stdout: "\n__UMBRAA_UPLOAD_EXIT_CODE__:56\n",
            stderr: "curl: (56) response ended early",
            exitCode: 0,
          };
        }
        return { stdout: "", stderr: "unexpected command", exitCode: 1 };
      },
    );

    await expect(
      uploadSandboxFileToConvex({
        sandbox: sandbox as any,
        userId: "u1",
        fullPath: "/home/user/chart-page-1.png",
        mediaType: "image/png",
      }),
    ).rejects.toThrow(/curl: \(56\) response ended early/);
  });

  test("uses Windows size fallback for Windows sandboxes", async () => {
    const sandbox = makeSandbox(0, false, true);
    (sandbox.commands.run as jest.Mock).mockImplementation(
      async (command: string) => {
        if (command.includes("stat -c%s")) {
          return {
            stdout: "",
            stderr: "'[' is not recognized as an internal or external command",
            exitCode: 1,
          };
        }
        if (command.startsWith("for %I")) {
          return { stdout: "4321", stderr: "", exitCode: 0 };
        }
        if (command.includes("curl -s -f -X POST")) {
          return {
            stdout: `{"storageId": "storage_win"}\n__UMBRAA_UPLOAD_EXIT_CODE__:0`,
            stderr: "",
            exitCode: 0,
          };
        }
        return { stdout: "", stderr: "unexpected command", exitCode: 1 };
      },
    );

    await uploadSandboxFileToConvex({
      sandbox: sandbox as any,
      userId: "u1",
      fullPath: "C:\\Users\\user\\report.zip",
    });

    expect(sandbox.commands.run).toHaveBeenNthCalledWith(
      2,
      'for %I in ("C:\\Users\\user\\report.zip") do @echo %~zI',
      expect.objectContaining({ displayName: "" }),
    );
    expect(mockConvexAction).toHaveBeenCalledWith(
      "fileActions:generateUploadUrl",
      expect.objectContaining({
        userId: "u1",
      }),
    );
  });

  test("derives the file name from Windows-style paths", async () => {
    const sandbox = makeSandbox(1234);

    await uploadSandboxFileToConvex({
      sandbox: sandbox as any,
      userId: "u1",
      fullPath: "C:\\Users\\user\\report.txt",
    });

    expect(mockConvexAction).toHaveBeenCalledWith(
      "fileActions:saveSandboxGeneratedFile",
      expect.objectContaining({
        name: "report.txt",
      }),
    );
  });

  test("uploads allowed E2B files from the sandbox without downloading into memory", async () => {
    const sandbox = makeSandbox(4321, true);

    await uploadSandboxFileToConvex({
      sandbox: sandbox as any,
      userId: "u1",
      fullPath: "/home/user/archive.tar.gz",
    });

    expect(sandbox.downloadUrl).not.toHaveBeenCalled();
    expect(sandbox.files.uploadToUrl).not.toHaveBeenCalled();
    expect(sandbox.commands.run).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(
        "curl -s -f -X POST -H 'Content-Type: application/octet-stream'",
      ),
      expect.objectContaining({
        timeoutMs: expect.any(Number),
      }),
    );
    const uploadCommand = (sandbox.commands.run as jest.Mock).mock.calls[1][0];
    expect(uploadCommand).toContain("'https://convex.example/upload-url'");
    expect(mockConvexAction).toHaveBeenCalledWith(
      "fileActions:saveSandboxGeneratedFile",
      expect.objectContaining({
        name: "archive.tar.gz",
        size: 4321,
        storageId: "storage_123",
      }),
    );
  });
});
