/** Record manual outreach sends (emailed outside admin UI) for dedupe in future campaigns. */

export interface ManualSendLogEntry {
  campaign: string
  email: string
  familyName: string
}

export interface ManualSendLogBatch {
  id: string
  label: string
  hint?: string
  entries: ManualSendLogEntry[]
}

export const MANUAL_SEND_LOG_BATCHES: ManualSendLogBatch[] = [
  {
    id: 'week1',
    label: 'Week 1: Champions',
    entries: [
      { campaign: 'champion', email: 'greer.abigail@gmail.com', familyName: 'The Oslin Family' },
      { campaign: 'champion', email: 'claresse.sheppard@gmail.com', familyName: 'The McKinney Family' },
      { campaign: 'champion', email: 'nicholemckenzie3@gmail.com', familyName: 'The McKenzie Family' },
    ],
  },
  {
    id: 'week2',
    label: 'Week 2: Routine + check-in',
    entries: [
      { campaign: 'routine-case-study', email: 'rumur.stamps@live.com', familyName: 'Wootten Family' },
      { campaign: 'win-back', email: 'yeliufiorella@gmail.com', familyName: 'THE GOATS' },
      { campaign: 'win-back', email: 'madtail.79@gmail.com', familyName: 'Chaos Clan' },
    ],
  },
]

export function getManualSendLogBatch(batchId: string): ManualSendLogBatch | undefined {
  return MANUAL_SEND_LOG_BATCHES.find((b) => b.id === batchId)
}
