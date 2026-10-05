export const formatClock = (t: number): string => `T+${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`
