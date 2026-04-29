export interface TaskJournal {
  id: string
  itemId: string
  itemTitle: string
  status: 'success' | 'failed'
  title: string
  content: string
  dataPreview: string | null
  errorMessage: string | null
  startAt: string
  endAt: string | null
  read: boolean
  createdAt: string
}

export interface TaskJournalRow {
  id: string
  itemId: string
  itemTitle: string
  status: string
  title: string
  content: string
  dataPreview: string | null
  errorMessage: string | null
  startAt: string
  endAt: string | null
  read: number
  createdAt: string
}

export interface CreateTaskJournalInput {
  itemId: string
  itemTitle: string
  status: 'success' | 'failed'
  title: string
  content: string
  dataPreview?: string | null
  errorMessage?: string | null
  startAt: string
  endAt?: string | null
}

export function taskJournalRowToTaskJournal(row: TaskJournalRow): TaskJournal {
  return {
    id: row.id,
    itemId: row.itemId,
    itemTitle: row.itemTitle,
    status: row.status as TaskJournal['status'],
    title: row.title,
    content: row.content,
    dataPreview: row.dataPreview,
    errorMessage: row.errorMessage,
    startAt: row.startAt,
    endAt: row.endAt,
    read: row.read === 1,
    createdAt: row.createdAt,
  }
}

export function taskJournalToRow(journal: TaskJournal): TaskJournalRow {
  return {
    id: journal.id,
    itemId: journal.itemId,
    itemTitle: journal.itemTitle,
    status: journal.status,
    title: journal.title,
    content: journal.content,
    dataPreview: journal.dataPreview,
    errorMessage: journal.errorMessage,
    startAt: journal.startAt,
    endAt: journal.endAt,
    read: journal.read ? 1 : 0,
    createdAt: journal.createdAt,
  }
}
