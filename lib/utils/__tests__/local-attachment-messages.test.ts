import {
  getEmptyProcessedMessagesCause,
} from "../local-attachment-messages";

describe("local attachment message helpers", () => {
  it("uses a preparation error for attachment-only empty requests", () => {
    expect(
      getEmptyProcessedMessagesCause([
        {
          parts: [{ type: "file", fileId: "file_123", name: "report.pdf" }],
        },
      ]),
    ).toBe(
      "The attached file could not be prepared for this request. Please reattach it or add a short message and try again.",
    );
  });
});
