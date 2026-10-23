import {timeEntryRepository} from '../repositories/timeEntry.repository';
import {membershipRepository} from '../repositories/membership.repository';
import {buildLookup, computeElapsedSeconds} from './timeEntry.service';
import {ApiError} from '../utils/error';
import {ErrorCodes} from '../constants/errorCodes';
import type {ReportQuery} from '../dtos/report.dto';

type ReportGroup = {
  key: string;
  label: string;
  totalSeconds: number;
  count: number;
};

export type ReportResult = {
  groupBy: ReportQuery['groupBy'];
  totalSeconds: number;
  totalCount: number;
  groups: ReportGroup[];
};

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;

  return [hours, minutes, secs]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

function groupKey(
  entry: {userId: string; projectId?: string | null; startTime: Date},
  groupBy: ReportQuery['groupBy']
): string {
  if (groupBy === 'project') return entry.projectId ?? '__none__';
  if (groupBy === 'member') return entry.userId;

  return new Date(entry.startTime).toISOString().slice(0, 10);
}

function groupLabel(
  entry: {userId: string; projectId?: string | null; startTime: Date},
  groupBy: ReportQuery['groupBy'],
  memberMap: Map<string, {email: string; firstName?: string; lastName?: string}>,
  projectMap: Map<string, string>
): string {
  if (groupBy === 'project') {
    if (!entry.projectId) return 'No project';

    return projectMap.get(entry.projectId) ?? 'Unknown project';
  }

  if (groupBy === 'member') {
    const member = memberMap.get(entry.userId);

    if (!member) return entry.userId;

    const name = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim();

    return name || member.email;
  }

  return new Date(entry.startTime).toISOString().slice(0, 10);
}

export const reportService = {
  async aggregate(
    workspaceId: string,
    userId: string,
    role: 'owner' | 'admin' | 'member',
    filters: ReportQuery
  ): Promise<ReportResult> {
    const isAdmin = role === 'owner' || role === 'admin';

    // Members can only ever see their own time, regardless of the requested filter.
    const targetUserId = isAdmin ? filters.memberId : userId;

    const entries = await timeEntryRepository.listForReport(workspaceId, {
      userId: targetUserId,
      projectId: filters.projectId,
      tagId: filters.tagId,
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
      limit: filters.limit
    });

    const memberships = await membershipRepository.findByWorkspace(workspaceId);
    const memberMap = new Map(
      memberships.map((membership) => [
        membership.userId,
        {
          email: membership.email,
          firstName: membership.firstName,
          lastName: membership.lastName
        }
      ])
    );

    const lookup = await buildLookup(workspaceId);
    const projectMap = lookup.projects;

    const groups = new Map<string, ReportGroup>();
    let totalSeconds = 0;
    let totalCount = 0;

    for (const entry of entries) {
      const duration = computeElapsedSeconds(entry);
      totalSeconds += duration;
      totalCount += 1;

      const key = groupKey(entry, filters.groupBy);
      const label = groupLabel(entry, filters.groupBy, memberMap, projectMap);

      const existing = groups.get(key);

      if (existing) {
        existing.totalSeconds += duration;
        existing.count += 1;
      } else {
        groups.set(key, {key, label, totalSeconds: duration, count: 1});
      }
    }

    const groupList = Array.from(groups.values());

    if (filters.groupBy === 'date') {
      groupList.sort((a, b) => a.key.localeCompare(b.key));
    } else {
      groupList.sort(
        (a, b) =>
          b.totalSeconds - a.totalSeconds ||
          a.label.localeCompare(b.label)
      );
    }

    return {
      groupBy: filters.groupBy,
      totalSeconds,
      totalCount,
      groups: groupList
    };
  },

  toCsv(result: ReportResult): string {
    const lines: string[] = [];
    lines.push('Group,Entries,Total Seconds,Total (HH:MM:SS)');

    for (const group of result.groups) {
      const escaped = `"${group.label.replace(/"/g, '""')}"`;
      lines.push(
        `${escaped},${group.count},${group.totalSeconds},${formatDuration(
          group.totalSeconds
        )}`
      );
    }

    lines.push(
      `"Total",${result.totalCount},${result.totalSeconds},${formatDuration(
        result.totalSeconds
      )}`
    );

    return lines.join('\n');
  }
};