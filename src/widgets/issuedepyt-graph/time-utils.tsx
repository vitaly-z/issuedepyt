export type DurationMs = number;
export type DurationDays = number;

export const isPastDate = (date: Date): boolean => {
  return new Date().getTime() > date.getTime();
};

export const getDuration = (firstDate: Date, secondDate: Date): DurationMs => {
  return secondDate.getTime() - firstDate.getTime();
};

export const durationToDays = (duration: DurationMs): number => {
  return Math.floor(duration / (1000 * 60 * 60 * 24));
};

/** Convert date diff to business days.
 * Implementation taken from https://stackoverflow.com/a/51091790
 */
export const calcBusinessDays = (startDate: Date, endDate: Date): number => {
  if (startDate > endDate) {
    return -1;
  }
  // Add 1 since dates are inclusive.
  const ONE_DAY = 1000 * 60 * 60 * 24;
  const endDateAdjusted = new Date(endDate.getTime() + ONE_DAY);
  const numDays = durationToDays(getDuration(startDate, endDateAdjusted));

  // a + b is number of extra days needed to expand total to full weeks.
  const a = startDate.getDay();
  const b = 6 - endDate.getDay();

  const WEEKDAYS_PER_WORKWEEK = 1.4; // 7 / 5.

  // Calculate number of weekend days.
  const m = [0, 0, 1, 2, 3, 4, 5];
  const numWeekendDays = m[a] + m[b];

  return Math.floor((numDays + a + b) / WEEKDAYS_PER_WORKWEEK) - numWeekendDays;
};
