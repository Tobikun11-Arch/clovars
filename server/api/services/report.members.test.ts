import {timeEntryRepository} from '../repositories/timeEntry.repository';
import {membershipRepository} from '../repositories/membership.repository';
import {workspaceRepository} from '../repositories/workspace.repository';
import {projectRepository} from '../repositories/project.repository';
import {taskRepository} from '../repositories/task.repository';
import {tagRepository} from '../repositories/tag.repository';
import {reportService} from './report.service';
import type {ReportQuery} from '../dtos/report.dto';

const HOUR = 3600;

function stopped(id: string, userId: string, startIso: string, seconds: number) {
  const startTime = new Date(startIso);
  return {
    id,
    workspaceId: 'ws',
    userId,
    projectId: null,
    taskId: null,
    tagIds: [],
    startTime,
    endTime: new Date(startTime.getTime() + seconds * 1000),
    durationSeconds: seconds,
    isRunning: false,
    isPaused: false
  };
}

beforeEach(() => {
  jest.spyOn(timeEntryRepository, 'findRunningInWorkspace').mockResolvedValue([]);
  jest.spyOn(timeEntryRepository, 'listForReport').mockResolvedValue([
    stopped('1', 'ana', '2026-11-16T09:00:00.000Z', 10 * HOUR),
    stopped('2', 'ben', '2026-11-16T10:00:00.000Z', 6 * HOUR),
    stopped('3', 'ana', '2026-11-16T20:00:00.000Z', 2 * HOUR),
    stopped('4', 'ben', '2026-11-17T09:00:00.000Z', 4 * HOUR)
  ] as never);
  jest.spyOn(membershipRepository, 'findByWorkspace').mockResolvedValue([
    {userId: 'ana', email: 'ana@example.com', firstName: 'Ana', lastName: 'Cruz'},
    {userId: 'ben', email: 'ben@example.com'}
  ] as never);
  jest.spyOn(workspaceRepository, 'findById').mockResolvedValue({name: 'Team'} as never);
  jest.spyOn(projectRepository, 'findByWorkspace').mockResolvedValue([]);
  jest.spyOn(taskRepository, 'findByWorkspace').mockResolvedValue([]);
  jest.spyOn(tagRepository, 'findByWorkspace').mockResolvedValue([]);
});

afterEach(() => jest.restoreAllMocks());

const byDate = {groupBy: 'date', timezoneOffset: 0} as ReportQuery;

describe('report member breakdown', () => {
  it('shows who tracked the time on each date for an all-members report', async () => {
    const report = await reportService.aggregate('ws', 'admin', 'owner', byDate);
    const [nov16, nov17] = report.groups;

    expect(nov16.key).toBe('2026-11-16');
    expect(nov16.totalSeconds).toBe(18 * HOUR);
    expect(nov16.members).toEqual([
      {userId: 'ana', name: 'Ana Cruz', totalSeconds: 12 * HOUR, count: 2},
      // No first/last name: falls back to the email.
      {userId: 'ben', name: 'ben@example.com', totalSeconds: 6 * HOUR, count: 1}
    ]);
    expect(nov17.members).toEqual([
      {userId: 'ben', name: 'ben@example.com', totalSeconds: 4 * HOUR, count: 1}
    ]);
  });

  it('leaves out the breakdown when the report is for one member', async () => {
    const report = await reportService.aggregate('ws', 'admin', 'owner', {
      ...byDate,
      memberId: 'ana'
    } as ReportQuery);
    expect(report.groups.every((group) => group.members.length === 0)).toBe(true);
  });

  it('leaves out the breakdown when grouping by member already', async () => {
    const report = await reportService.aggregate('ws', 'admin', 'owner', {
      ...byDate,
      groupBy: 'member'
    } as ReportQuery);
    expect(report.groups.every((group) => group.members.length === 0)).toBe(true);
  });
});
