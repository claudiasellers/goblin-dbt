import { useState, useMemo } from 'react';
import type { CheckInRecord } from '../../services/neo4j';
import type { TimeRange } from './useFilteredCheckIns';

const quadrantPrefix: Record<string, string> = {
  'high-unpleasant': 'hu',
  'high-pleasant': 'hp',
  'low-unpleasant': 'lu',
  'low-pleasant': 'lp',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CalendarViewProps {
  checkIns: CheckInRecord[];
  range: TimeRange;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Get the Sunday that starts the week containing `date`
function getWeekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function DayCell({
  date,
  checkInsByDay,
  isToday,
}: {
  date: Date;
  checkInsByDay: Map<string, CheckInRecord[]>;
  isToday: boolean;
}) {
  const key = dateKey(date);
  const dayCheckIns = checkInsByDay.get(key) || [];
  const uniqueQuadrants = [...new Set(dayCheckIns.map((ci) => ci.quadrant))];

  return (
    <div
      className={`h-10 flex flex-col items-center justify-center rounded-md ${
        isToday ? 'bg-[var(--color-accent)]/10' : ''
      }`}
    >
      <span
        className={`text-xs ${
          isToday
            ? 'font-bold text-[var(--color-accent)]'
            : dayCheckIns.length > 0
              ? 'text-[var(--color-text-primary)]'
              : 'text-[var(--color-text-tertiary)]'
        }`}
      >
        {date.getDate()}
      </span>
      {uniqueQuadrants.length > 0 && (
        <div className="flex gap-[3px] mt-[2px]">
          {uniqueQuadrants.map((q) => {
            const prefix = quadrantPrefix[q] || 'hu';
            return (
              <span
                key={q}
                className="block w-[5px] h-[5px] rounded-full"
                style={{ backgroundColor: `var(--color-q-${prefix}-fill)` }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CalendarView({ checkIns, range }: CalendarViewProps) {
  const today = new Date();

  const [monthViewDate, setMonthViewDate] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));

  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, etc.

  const checkInsByDay = useMemo(() => {
    const map = new Map<string, CheckInRecord[]>();
    for (const ci of checkIns) {
      const key = dateKey(ci.timestamp);
      const arr = map.get(key) || [];
      arr.push(ci);
      map.set(key, arr);
    }
    return map;
  }, [checkIns]);

  const isWeekView = range === '7d';

  // --- Week view logic ---
  const weekStart = useMemo(() => {
    const base = getWeekStart(today);
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  const weekLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    return `${fmt.format(weekStart)} - ${fmt.format(end)}`;
  }, [weekStart]);

  // Don't allow navigating forward past the current week
  const canGoNextWeek = weekOffset < 0;
  // Don't go back more than ~4 weeks (the 7-day filter only has 7 days of data, but let them browse a bit)
  const canGoPrevWeek = (() => {
    if (checkIns.length === 0) return false;
    const earliest = checkIns.reduce((min, ci) => (ci.timestamp < min ? ci.timestamp : min), checkIns[0].timestamp);
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(prevWeekStart);
    prevWeekEnd.setDate(prevWeekEnd.getDate() + 6);
    // Allow going back if the previous week's end is on or after the earliest check-in
    return prevWeekEnd >= earliest;
  })();

  // --- Month view logic ---
  const monthBounds = useMemo(() => {
    if (checkIns.length === 0) return null;
    const sorted = [...checkIns].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const first = sorted[0].timestamp;
    const last = sorted[sorted.length - 1].timestamp;
    return {
      minYear: first.getFullYear(),
      minMonth: first.getMonth(),
      maxYear: last.getFullYear(),
      maxMonth: last.getMonth(),
    };
  }, [checkIns]);

  const canGoPrevMonth = monthBounds
    ? monthViewDate.year > monthBounds.minYear || (monthViewDate.year === monthBounds.minYear && monthViewDate.month > monthBounds.minMonth)
    : false;
  const canGoNextMonth =
    monthViewDate.year < today.getFullYear() || (monthViewDate.year === today.getFullYear() && monthViewDate.month < today.getMonth());

  function goPrevMonth() {
    setMonthViewDate((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
  }

  function goNextMonth() {
    setMonthViewDate((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: prev.month + 1 };
    });
  }

  const daysInMonth = new Date(monthViewDate.year, monthViewDate.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(monthViewDate.year, monthViewDate.month, 1).getDay();
  const isCurrentMonth = monthViewDate.year === today.getFullYear() && monthViewDate.month === today.getMonth();

  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    new Date(monthViewDate.year, monthViewDate.month, 1)
  );

  const monthCells: (Date | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) monthCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) monthCells.push(new Date(monthViewDate.year, monthViewDate.month, d));

  // Nav arrow SVGs
  const LeftArrow = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  );
  const RightArrow = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  );

  return (
    <div className="bg-[var(--color-glass-card)] backdrop-blur-md border border-[var(--color-glass-border)] rounded-xl p-4">
      {/* Header with nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={isWeekView ? () => setWeekOffset((o) => o - 1) : goPrevMonth}
          disabled={isWeekView ? !canGoPrevWeek : !canGoPrevMonth}
          className="p-1 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-30 disabled:cursor-default transition-colors"
          aria-label={isWeekView ? 'Previous week' : 'Previous month'}
        >
          {LeftArrow}
        </button>
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
          {isWeekView ? weekLabel : monthLabel}
        </h3>
        <button
          onClick={isWeekView ? () => setWeekOffset((o) => o + 1) : goNextMonth}
          disabled={isWeekView ? !canGoNextWeek : !canGoNextMonth}
          className="p-1 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-30 disabled:cursor-default transition-colors"
          aria-label={isWeekView ? 'Next week' : 'Next month'}
        >
          {RightArrow}
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="text-center text-[10px] font-medium text-[var(--color-text-tertiary)] py-1">
            {wd}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px">
        {isWeekView
          ? weekDays.map((date) => (
              <DayCell
                key={dateKey(date)}
                date={date}
                checkInsByDay={checkInsByDay}
                isToday={isSameDay(date, today)}
              />
            ))
          : monthCells.map((date, idx) =>
              date === null ? (
                <div key={`blank-${idx}`} className="h-10" />
              ) : (
                <DayCell
                  key={dateKey(date)}
                  date={date}
                  checkInsByDay={checkInsByDay}
                  isToday={isCurrentMonth && date.getDate() === today.getDate()}
                />
              )
            )}
      </div>
    </div>
  );
}
