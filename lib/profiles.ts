// lib/profiles.ts
import { prisma } from "./db";

export type AgentProfile = {
  userKey: string;                 // unique per agent (we'll use email)
  bio: string;
  headshotUrl?: string | null;     // public URL (Vercel Blob)
  createdAt: string;               // ISO
  updatedAt: string;               // ISO
};

export async function getOrCreateProfile(userKey: string): Promise<AgentProfile> {
  let p = await prisma.profile.findUnique({ where: { userKey } });
  if (!p) {
    p = await prisma.profile.create({ data: { userKey, bio: "" } });
  }
  return {
    userKey: p.userKey,
    bio: p.bio,
    headshotUrl: p.headshotUrl,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function updateProfile(
  userKey: string,
  data: { bio?: string; headshotUrl?: string | null }
): Promise<AgentProfile> {
  const p = await prisma.profile.upsert({
    where: { userKey },
    update: { ...data },
    create: { userKey, bio: data.bio ?? "", headshotUrl: data.headshotUrl },
  });
  return {
    userKey: p.userKey,
    bio: p.bio,
    headshotUrl: p.headshotUrl,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
