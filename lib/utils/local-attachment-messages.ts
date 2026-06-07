type MessageWithParts = {
  parts?: unknown[];
};

const getPartFields = (part: unknown) =>
  part && typeof part === "object"
    ? (part as { type?: unknown })
    : undefined;

export const hasFileAttachments = (messages: MessageWithParts[]): boolean =>
  messages.some((message) =>
    message.parts?.some((part) => getPartFields(part)?.type === "file"),
  );

export const getEmptyProcessedMessagesCause = (
  messages: MessageWithParts[],
): string => {
  if (hasFileAttachments(messages)) {
    return "The attached file could not be prepared for this request. Please reattach it or add a short message and try again.";
  }

  return "Your message could not be processed because it did not contain any usable content. Please add a short message and try again.";
};
