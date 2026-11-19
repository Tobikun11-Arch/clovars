import {timeEntryRepository} from '../repositories/timeEntry.repository';
import {
  autoStopIfExpired,
  autoStopTime,
  resolveTimerStart
} from './timeEntry.service';
import type {TimeEntryDocument} from '../models/TimeEntry.model';

const HOUR = 60 * 60 * 1000;
const DAY_SECONDS = 24 * 60 * 60;
const start = new Date('2026-11-01T08:00:00.000Z');

function entry(overrides: Partial<TimeEntryDocument> = {}): TimeEntryDocument {
  return {
    id: 'entry-1',
    workspaceId: 'ws-1',
    userId: 'user-1',
    startTime: start,
    durationSeconds: 0,
    isRunning: true,
    isPaused: false,
    pausedAt: null,
    lastResumedAt: start,
    ...overrides
  } as TimeEntryDocument;
}

describe('autoStopTime', () => {
  it('is exactly 24 hours after start for an uninterrupted timer', () => {
    expect(autoStopTime(entry())?.toISOString()).toBe(
      new Date(start.getTime() + 24 * HOUR).toISOString()
    );
  });

  it('counts only tracked time when the timer was paused and resumed', () => {
    // 10h tracked before a pause, resumed at 20:00 -> 14h left -> 10:00 next day.
    const resumedAt = new Date(start.getTime() + 12 * HOUR);
    const result = autoStopTime(
      entry({durationSeconds: 10 * 3600, lastResumedAt: resumedAt})
    );
    expect(result?.toISOString()).toBe(
      new Date(resumedAt.getTime() + 14 * HOUR).toISOString()
    );
  });

  it('never expires a paused timer under the limit', () => {
    expect(
      autoStopTime(entry({isPaused: true, durationSeconds: 5 * 3600}))
    ).toBeNull();
  });

  it('expires a paused timer that is already over the limit at its pause time', () => {
    const pausedAt = new Date(start.getTime() + 30 * HOUR);
    expect(
      autoStopTime(
        entry({isPaused: true, durationSeconds: 30 * 3600, pausedAt})
      )?.toISOString()
    ).toBe(pausedAt.toISOString());
  });

  it('ignores stopped entries', () => {
    expect(autoStopTime(entry({isRunning: false}))).toBeNull();
  });
});

describe('autoStopIfExpired', () => {
  let stopSpy: jest.SpyInstance;

  beforeEach(() => {
    stopSpy = jest
      .spyOn(timeEntryRepository, 'stopIfRunning')
      .mockResolvedValue(true);
  });

  afterEach(() => stopSpy.mockRestore());

  it('does nothing before the 24-hour mark', async () => {
    const now = new Date(start.getTime() + 23 * HOUR);
    await expect(autoStopIfExpired(entry(), now)).resolves.toBe(false);
    expect(stopSpy).not.toHaveBeenCalled();
  });

  it('saves a forgotten timer as exactly 24 hours, ending at the limit', async () => {
    // Device shut down; the app is reopened three days later.
    const now = new Date(start.getTime() + 72 * HOUR);
    await expect(autoStopIfExpired(entry(), now)).resolves.toBe(true);
    expect(stopSpy).toHaveBeenCalledWith('entry-1', {
      endTime: new Date(start.getTime() + 24 * HOUR),
      durationSeconds: DAY_SECONDS,
      isRunning: false,
      isPaused: false,
      pausedAt: null,
      lastResumedAt: null,
      autoStopped: true
    });
  });

  it('reports false when another request already stopped it', async () => {
    stopSpy.mockResolvedValue(false);
    const now = new Date(start.getTime() + 25 * HOUR);
    await expect(autoStopIfExpired(entry(), now)).resolves.toBe(false);
  });
});

describe('resolveTimerStart', () => {
  const now = new Date('2026-11-20T22:00:00.000Z');

  it('uses now when no start time is given', () => {
    expect(resolveTimerStart(undefined, now)).toBe(now);
  });

  it('accepts a start time in the past, e.g. one hour ago', () => {
    const oneHourAgo = new Date(now.getTime() - HOUR);
    expect(resolveTimerStart(oneHourAgo.toISOString(), now)).toEqual(oneHourAgo);
  });

  it('treats a few seconds in the future (clock drift) as now', () => {
    const slightlyAhead = new Date(now.getTime() + 20 * 1000);
    expect(resolveTimerStart(slightlyAhead.toISOString(), now)).toBe(now);
  });

  it('rejects a start time in the future', () => {
    const later = new Date(now.getTime() + HOUR);
    expect(() => resolveTimerStart(later.toISOString(), now)).toThrow(
      'Start time cannot be in the future'
    );
  });

  it('rejects a start time 24 or more hours ago', () => {
    const dayAgo = new Date(now.getTime() - 24 * HOUR);
    expect(() => resolveTimerStart(dayAgo.toISOString(), now)).toThrow(
      /24 or more hours ago/
    );
  });

  it('rejects an invalid date', () => {
    expect(() => resolveTimerStart('not-a-date', now)).toThrow(
      'Start time is not a valid date'
    );
  });
});
