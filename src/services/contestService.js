import { TABLES, requireSupabase, selectAll, selectOne, throwIfError } from './baseService'

const CONTEST_FIELDS = ['title','organizer','prize','registration_period','registration_deadline','category','description','link','max_team_size','duplicate_allowed','has_presentation','presentation_date','hackathon_date','linked_commercialization','has_certificate','award_count','notes','is_active']
const NUMBER_FIELDS = new Set(['max_team_size'])
const BOOLEAN_FIELDS = new Set(['duplicate_allowed', 'has_presentation', 'linked_commercialization', 'has_certificate', 'is_active'])
const cleanContest = (values) => Object.fromEntries(CONTEST_FIELDS.map((key) => {
  const value = values[key]
  if (value === '' || value === undefined) return [key, null]
  if (NUMBER_FIELDS.has(key)) return [key, Number(value)]
  if (BOOLEAN_FIELDS.has(key)) return [key, Boolean(value)]
  return [key, typeof value === 'string' ? value.trim() : value]
}))

export async function getActiveContests() {
  const client = requireSupabase()
  const { data, error } = await client.from(TABLES.contests).select('*').eq('is_active', true).order('id', { ascending: false })
  throwIfError(error); return (data ?? []).filter(isContestOpen)
}
export const getAllContests = () => selectAll(TABLES.contests)
export const getContestById = (id) => selectOne(TABLES.contests, id)
export async function createContest(values) {
  const payload = cleanContest(values)
  const { data, error } = await requireSupabase().from(TABLES.contests).insert(payload).select('*').maybeSingle()
  throwIfError(error); return data ?? payload
}
export async function updateContest(id, values) {
  const payload = cleanContest(values)
  const { data, error } = await requireSupabase().from(TABLES.contests).update(payload).eq('id', id).select('*').maybeSingle()
  throwIfError(error); return data ?? { id, ...payload }
}
export async function setContestActive(id, isActive) {
  const { data, error } = await requireSupabase().from(TABLES.contests).update({ is_active: isActive }).eq('id', id).select('*').maybeSingle()
  throwIfError(error); return data ?? { id, is_active: isActive }
}

export function isContestOpen(contest) {
  if (!contest?.registration_deadline) return true
  const deadline = new Date(`${String(contest.registration_deadline).slice(0, 10)}T23:59:59`)
  if (Number.isNaN(deadline.getTime())) return true
  return deadline.getTime() >= Date.now()
}
