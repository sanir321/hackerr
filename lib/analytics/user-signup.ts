import type { User } from "@workos-inc/node";

export function captureUserSignedUp({
  user,
  workosEventId,
  workosEventCreatedAt,
}: {
  user: User;
  workosEventId: string;
  workosEventCreatedAt: string;
}) {
}
