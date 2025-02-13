export type DurationMs = number;
export type DurationDays = number;

export const isPastDate = (date: Date): boolean => {
  return (new Date()).getTime() > date.getTime();
};

export const getDuration = (firstDate: Date, secondDate: Date): DurationMs => {
  return secondDate.getTime() - firstDate.getTime();
};

export const durationToDays = (duration: DurationMs): number => {
  return Math.floor(duration / (1000 * 60 * 60 * 24));
};