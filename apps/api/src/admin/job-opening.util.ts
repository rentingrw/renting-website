import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

export type PublicJobOpeningDto = {
  id: string;
  title: string;
  employmentType: string;
  location: string;
  description: string;
  externalApplyUrl: string | null;
  createdAt: string;
  applicationDeadline: string | null;
};

export function serializePublicJobOpening(row: {
  id: string;
  title: string;
  employmentType: string;
  location: string;
  description: string;
  externalApplyUrl: string | null;
  createdAt: Date;
  applicationDeadline: Date | null;
}): PublicJobOpeningDto {
  return {
    id: row.id,
    title: row.title,
    employmentType: row.employmentType,
    location: row.location,
    description: row.description,
    externalApplyUrl: row.externalApplyUrl,
    createdAt: row.createdAt.toISOString(),
    applicationDeadline: row.applicationDeadline?.toISOString() ?? null,
  };
}

export function publicJobOpeningWhere(now = new Date()): Prisma.JobOpeningWhereInput {
  return {
    isActive: true,
    OR: [{ applicationDeadline: null }, { applicationDeadline: { gt: now } }],
  };
}

export function parseJobApplicationDeadline(value?: string | null): Date | null {
  if (value == null || (typeof value === 'string' && value.trim() === '')) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Invalid application deadline.');
  }
  return date;
}

export function assertJobAcceptingApplications(deadline: Date | null, now = new Date()) {
  if (deadline && deadline <= now) {
    throw new BadRequestException('Applications for this role are closed.');
  }
}