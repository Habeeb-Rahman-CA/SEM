export interface ScheduledMessageSeed {
  senderName: string;
  content: string;
  offsetMs: number;
}

export const DEFAULT_SCHEDULED_MESSAGES_SEED: ScheduledMessageSeed[] = [
  {
    senderName: 'Habeeb Rahman',
    content: '📣 Scheduled Notice: Pitch lighting check at 5:00 PM IST.',
    offsetMs: 3600000, // 1 hour ahead
  },
];
