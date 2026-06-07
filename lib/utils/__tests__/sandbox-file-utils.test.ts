jest.mock("server-only", () => ({}), { virtual: true });

import type { UIMessage } from "ai";
import {
  rewriteSandboxFilePathsInMessages,
  uploadSandboxFiles,
} from "../sandbox-file-utils";

describe("sandbox file helpers", () => {
  it("retries url uploads in a writable directory when /tmp is not writable", async () => {
    const consoleWarnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => {});
    const downloadFromUrl = jest
      .fn()
      .mockRejectedValueOnce(
        new Error(
          "Failed to download file: mkdir: cannot create directory '/tmp/umbraa-upload': Permission denied",
        ),
      )
      .mockResolvedValueOnce(undefined);
    const run = jest.fn().mockResolvedValue({
      exitCode: 0,
      stdout: "/home/alice/umbraa-upload/report.pdf",
      stderr: "",
    });

    try {
      const result = await uploadSandboxFiles(
        [
          {
            kind: "url",
            url: "https://example.com/report.pdf",
            localPath: "/tmp/umbraa-upload/report.pdf",
          },
        ],
        async () => ({
          commands: { run },
          files: { downloadFromUrl },
        }),
      );

      expect(result).toEqual({
        failedCount: 0,
        pathRewrites: [
          {
            from: "/tmp/umbraa-upload/report.pdf",
            to: "/home/alice/umbraa-upload/report.pdf",
          },
        ],
      });
      expect(downloadFromUrl).toHaveBeenCalledWith(
        "https://example.com/report.pdf",
        "/tmp/umbraa-upload/report.pdf",
      );
      expect(downloadFromUrl).toHaveBeenCalledWith(
        "https://example.com/report.pdf",
        "/home/alice/umbraa-upload/report.pdf",
      );
    } finally {
      consoleWarnSpy.mockRestore();
    }
  });

  it("blocks internal URL downloads before invoking the sandbox", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const downloadFromUrl = jest.fn();

    try {
      const result = await uploadSandboxFiles(
        [
          {
            kind: "url",
            url: "http://169.254.169.254/latest/meta-data",
            localPath: "/home/user/upload/meta-data",
          },
        ],
        async () => ({
          files: { downloadFromUrl },
        }),
      );

      expect(result.failedCount).toBe(1);
      expect(downloadFromUrl).not.toHaveBeenCalled();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("rewrites attachment tags after upload path fallback", () => {
    const messages = [
      {
        id: "m1",
        role: "user",
        parts: [
          {
            type: "text",
            text: '<attachment filename="report.pdf" local_path="/tmp/umbraa-upload/report.pdf" />',
          },
        ],
      },
    ] as UIMessage[];

    const rewritten = rewriteSandboxFilePathsInMessages(messages, [
      {
        from: "/tmp/umbraa-upload/report.pdf",
        to: "/home/alice/umbraa-upload/report.pdf",
      },
    ]);

    expect(rewritten[0].parts?.[0]).toMatchObject({
      text: '<attachment filename="report.pdf" local_path="/home/alice/umbraa-upload/report.pdf" />',
    });
  });
});
