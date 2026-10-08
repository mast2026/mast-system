import { requireSupabase } from './baseService'

export async function serverAuth(action, payload = {}) {
  const { data, error } = await requireSupabase().functions.invoke('mast-auth', { body: { action, ...payload } })
  if (error) {
    let message = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
    try { message = (await error.context.clone().json()).error || message } catch { /* transport failure */ }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

export async function establishSession(action, payload) {
  const data = await serverAuth(action, payload)
  if (!data?.session || !data.member) throw new Error('로그인 세션을 발급하지 못했습니다.')
  const { error } = await requireSupabase().auth.setSession(data.session)
  if (error) throw error
  return data.member
}
