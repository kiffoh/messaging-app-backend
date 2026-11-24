import type { Prisma } from "@prisma/client";

// Never select password: every user in a response goes through this.
export const publicUser = { id: true, username: true, bio: true, photo: true, createdAt: true } satisfies Prisma.UserSelect;

// dd-mm-yyyy and hh:mm in UTC, the shape the frontend reads
export function withFormattedDate<T extends { createdAt: Date }>(row: T) {
  const [y, m, d, hh, mm] = row.createdAt.toISOString().match(/\d+/g)!;
  return { ...row, createdAtDate: `${d}-${m}-${y}`, createdAtTime: `${hh}:${mm}` };
}
