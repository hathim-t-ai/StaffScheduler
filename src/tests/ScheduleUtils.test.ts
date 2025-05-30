// Mock the getSupabaseClient function
jest.mock('../utils/ScheduleUtils', () => {
  const actual = jest.requireActual('../utils/ScheduleUtils');
  return {
    ...actual,
    getSupabaseClient: () => ({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        data: [],
        error: null,
        status: 200,
        statusText: 'OK'
      }))
    })
  };
});

import { formatDate, formatDateISO, parseISODate, getDatesForCurrentWeek, isAtEndDate, getBackgroundColor, getTaskText, getWeeklyHours, hasAssignments } from '../utils/ScheduleUtils';

describe('ScheduleUtils', () => {
  let mockData: any[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    mockData = [];

    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation(() => ({
          eq: jest.fn().mockImplementation(() => ({
            data: mockData,
            error: null,
            status: 200,
            statusText: 'OK'
          }))
        }))
      })
    };

    jest.spyOn(require('../utils/ScheduleUtils'), 'getSupabaseClient')
      .mockReturnValue(mockSupabase);
  });

  test('formatDate formats date correctly', () => {
    const date = new Date('2024-05-15');
    expect(formatDate(date)).toBe('15 May');
  });

  test('formatDateISO formats date as ISO string', () => {
    const date = new Date('2024-05-15');
    expect(formatDateISO(date)).toBe('2024-05-15');
  });

  test('parseISODate parses ISO string to Date object', () => {
    const dateString = '2024-05-15';
    const date = parseISODate(dateString);
    expect(date.toISOString().split('T')[0]).toBe(dateString);
  });

  test('getDatesForCurrentWeek returns correct dates', () => {
    const startDate = new Date('2024-05-13'); // Monday
    const dates = getDatesForCurrentWeek(startDate);
    expect(dates.length).toBe(5);
    expect(dates[0].toISOString().split('T')[0]).toBe('2024-05-13');
    expect(dates[4].toISOString().split('T')[0]).toBe('2024-05-17');
  });

  test('isAtEndDate checks if date is at end date limit', () => {
    const currentStartDate = new Date('2026-05-25');
    expect(isAtEndDate(currentStartDate)).toBe(true);
  });

  test('getBackgroundColor returns correct color', () => {
    const tasks = [{ taskType: 'Project A', hours: 4 }];
    expect(getBackgroundColor(tasks)).toBe('#FFF9C4');
  });

  test('getTaskText returns correct text', () => {
    const tasks = [{ taskType: 'Project A', hours: 4 }];
    expect(getTaskText(tasks)).toBe('Project A: 4 hrs');
  });

  test('getWeeklyHours fetches and calculates hours correctly', async () => {
    mockData = [
      { taskType: 'Project A', hours: 4 },
      { taskType: 'Project B', hours: 2 }
    ];
    const staffId = '1';
    const weekDates = [new Date('2024-05-13'), new Date('2024-05-14')];
    const tasks = [{ taskType: 'Project A', hours: 4 }];
    const hours = await getWeeklyHours(staffId, weekDates, tasks);
    expect(hours).toBe(12); // 6 hours per day for 2 days
  });

  test('hasAssignments checks if staff has assignments', async () => {
    mockData = [
      { taskType: 'Project A', hours: 4 }
    ];
    const staffId = '1';
    const date = '2024-05-13';
    const tasks = [{ taskType: 'Project A', hours: 4 }];
    const hasAssignmentsResult = await hasAssignments(staffId, date, tasks);
    expect(hasAssignmentsResult).toBe(true);
  });
}); 