import {timeEntryRepository} from '../repositories/timeEntry.repository';
import {membershipRepository} from '../repositories/membership.repository';
import {workspaceRepository} from '../repositories/workspace.repository';
import {buildLookup, computeElapsedSeconds} from './timeEntry.service';
import {ApiError} from '../utils/error';
import {ErrorCodes} from '../constants/errorCodes';
import type {ReportQuery} from '../dtos/report.dto';

type ReportGroup = {
  key: string;
  label: string;
  totalSeconds: number;
  count: number;
  date: string | null;
  endDate: string | null;
};

export type ReportResult = {
  groupBy: ReportQuery['groupBy'];
  totalSeconds: number;
  totalCount: number;
  groups: ReportGroup[];
  from: string | null;
  to: string | null;
  fromDate: string | null;
  toDate: string | null;
  startDate: string | null;
  endDate: string | null;
  filters: {from: string | null; to: string | null};
  dateRange: {from: string | null; to: string | null};
  generatedAt: string;
  generatedDate: string;
  reportDate: string;
  date: string;
  workspaceName: string;
  memberLabel: string;
  projectLabel: string;
  tagLabel: string;
  dateFrom: string;
  dateTo: string;
  reportGenerated: string;
  groupByLabel: string;
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

function localDateKey(date: Date, offsetMinutes = 0): string {
  const local = new Date(date.getTime() - offsetMinutes * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function formatLocalDateTime(date: Date, offsetMinutes = 0): string {
  const local = new Date(date.getTime() - offsetMinutes * 60 * 1000);
  return local.toISOString().slice(0, 19).replace('T', ' ');
}

function groupKey(
  entry: {userId: string; projectId?: string | null; startTime: Date},
  groupBy: ReportQuery['groupBy'],
  offsetMinutes = 0
): string {
  if (groupBy === 'project') return entry.projectId ?? '__none__';
  if (groupBy === 'member') return entry.userId;

  return localDateKey(entry.startTime, offsetMinutes);
}

function groupLabel(
  entry: {userId: string; projectId?: string | null; startTime: Date},
  groupBy: ReportQuery['groupBy'],
  memberMap: Map<string, {email: string; firstName?: string; lastName?: string}>,
  projectMap: Map<string, string>,
  offsetMinutes = 0
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

  return localDateKey(entry.startTime, offsetMinutes);
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
    const tagMap = lookup.tags;

    const workspace = await workspaceRepository.findById(workspaceId);
    const workspaceName = workspace ? workspace.name : workspaceId;

    const targetMember = targetUserId
      ? memberMap.get(targetUserId)
      : undefined;
    const memberLabel = targetUserId
      ? targetMember
        ? `${targetMember.firstName ?? ''} ${targetMember.lastName ?? ''}`.trim() ||
          targetMember.email
        : targetUserId
      : 'All members';

    const projectLabel = filters.projectId
      ? projectMap.get(filters.projectId) ?? 'Unknown project'
      : 'All projects';

    const tagLabel = filters.tagId
      ? tagMap.get(filters.tagId)?.name ?? 'Unknown tag'
      : 'All tags';

    const groupByLabel =
      filters.groupBy === 'project'
        ? 'Project'
        : filters.groupBy === 'member'
          ? 'Member'
          : 'Date';

    const offsetMinutes = filters.timezoneOffset ?? 0;
    const reportGenerated = formatLocalDateTime(new Date(), offsetMinutes);

    const groups = new Map<string, ReportGroup>();
    let totalSeconds = 0;
    let totalCount = 0;

    for (const entry of entries) {
      const duration = computeElapsedSeconds(entry);
      totalSeconds += duration;
      totalCount += 1;

      const key = groupKey(entry, filters.groupBy, filters.timezoneOffset);
      const label = groupLabel(
        entry,
        filters.groupBy,
        memberMap,
        projectMap,
        filters.timezoneOffset
      );

      const existing = groups.get(key);
      const entryDate =
        filters.groupBy === 'date'
          ? key
          : localDateKey(entry.startTime, filters.timezoneOffset);

      if (existing) {
        existing.totalSeconds += duration;
        existing.count += 1;
        if (existing.date === null || entryDate < existing.date)
          existing.date = entryDate;
        if (existing.endDate === null || entryDate > existing.endDate)
          existing.endDate = entryDate;
      } else {
        groups.set(key, {
          key,
          label,
          totalSeconds: duration,
          count: 1,
          date: entryDate,
          endDate: entryDate
        });
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
      groups: groupList,
      from: filters.from ?? null,
      to: filters.to ?? null,
      fromDate: filters.from ?? null,
      toDate: filters.to ?? null,
      startDate: filters.from ?? null,
      endDate: filters.to ?? null,
      filters: {from: filters.from ?? null, to: filters.to ?? null},
      dateRange: {from: filters.from ?? null, to: filters.to ?? null},
      generatedAt: new Date().toISOString(),
      generatedDate: new Date().toISOString(),
      reportDate: new Date().toISOString(),
      date: new Date().toISOString(),
      workspaceName,
      memberLabel,
      projectLabel,
      tagLabel,
      dateFrom: filters.from ?? '',
      dateTo: filters.to ?? '',
      reportGenerated,
      groupByLabel
    };
  },

  toCsv(result: ReportResult): string {
    const escape = (value: unknown): string => {
      const text = String(value ?? '');
      if (/[",\n\r]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const headers = [
      'Workspace',
      'Member',
      'Project',
      'Tag',
      'Date From',
      'Date To',
      result.groupByLabel,
      'Entries',
      'Duration (HH:MM:SS)',
      'Duration (Hours)',
      'Report Generated'
    ];

    const lines: string[] = [headers.map(escape).join(',')];

    for (const group of result.groups) {
      const hours = (group.totalSeconds / 3600).toFixed(2);
      const row = [
        result.workspaceName,
        result.memberLabel,
        result.projectLabel,
        result.tagLabel,
        result.dateFrom,
        result.dateTo,
        group.label,
        group.count,
        formatDuration(group.totalSeconds),
        hours,
        result.reportGenerated
      ];
      lines.push(row.map(escape).join(','));
    }

    return '\uFEFF' + lines.join('\n');
  },

  detailedCsv(
    workspaceId: string,
    userId: string,
    role: 'owner' | 'admin' | 'member',
    filters: ReportQuery
  ): Promise<string> {
    const isAdmin = role === 'owner' || role === 'admin';
    const targetUserId = isAdmin ? filters.memberId : userId;
    const offsetMinutes = filters.timezoneOffset ?? 0;

    const entriesPromise = timeEntryRepository.listForReport(workspaceId, {
      userId: targetUserId,
      projectId: filters.projectId,
      tagId: filters.tagId,
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
      limit: filters.limit
    });

    const membershipsPromise = membershipRepository.findByWorkspace(workspaceId);
    const lookupPromise = buildLookup(workspaceId);
    const workspacePromise = workspaceRepository.findById(workspaceId);

    return Promise.all([
      entriesPromise,
      membershipsPromise,
      lookupPromise,
      workspacePromise
    ]).then(([entries, memberships, lookup, workspace]) => {
      const memberMap = new Map(
        memberships.map((membership) => [
          membership.userId,
          `${membership.firstName ?? ''} ${membership.lastName ?? ''}`.trim() ||
            membership.email
        ])
      );
      const workspaceName = workspace ? workspace.name : workspaceId;

      const escape = (value: unknown): string => {
        const text = String(value ?? '');
        if (/[",\n\r]/.test(text)) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      };

      const headers = [
        'Workspace',
        'Member',
        'Project',
        'Description',
        'Tags',
        'Start Date',
        'Start Time',
        'End Date',
        'End Time',
        'Duration (HH:MM:SS)',
        'Duration (Hours)'
      ];

      const lines: string[] = [headers.map(escape).join(',')];

      const localDate = (date: Date) =>
        new Date(date.getTime() - offsetMinutes * 60 * 1000)
          .toISOString()
          .slice(0, 10);
      const localTime = (date: Date) =>
        new Date(date.getTime() - offsetMinutes * 60 * 1000)
          .toISOString()
          .slice(11, 19);

      for (const entry of entries) {
        const duration = computeElapsedSeconds(entry);
        const projectName = entry.projectId
          ? (lookup.projects.get(entry.projectId) ?? 'Unknown project')
          : 'No project';
        const tagNames = (entry.tagIds ?? [])
          .map((tagId) => lookup.tags.get(tagId)?.name)
          .filter((name): name is string => Boolean(name))
          .join('; ');
        const startDate = localDate(entry.startTime);
        const startTime = localTime(entry.startTime);
        const endDate = entry.endTime
          ? localDate(entry.endTime)
          : startDate;
        const endTime = entry.endTime
          ? localTime(entry.endTime)
          : localTime(new Date(entry.startTime.getTime() + duration * 1000));
        const row = [
          workspaceName,
          memberMap.get(entry.userId) ?? entry.userId,
          projectName,
          entry.description ?? '',
          tagNames,
          startDate,
          startTime,
          endDate,
          endTime,
          formatDuration(duration),
          (duration / 3600).toFixed(2)
        ];
        lines.push(row.map(escape).join(','));
      }

      return '\uFEFF' + lines.join('\n');
    });
  }
};
