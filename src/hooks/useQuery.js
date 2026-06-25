import { useCallback, useEffect, useRef, useState } from 'react'

export default function useQuery(query, deps = [], options = {}) {
  const { initialData = null, timeoutMs = 8000 } = options
  const [state, setState] = useState({
    data: initialData,
    loading: true,
    error: null,
    warning: null,
  })
  // 동시에 여러 번 호출(연속 삭제 등)될 때 마지막 요청 결과만 반영되도록 보호
  const requestIdRef = useRef(0)
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const load = useCallback(async () => {
    const myRequestId = ++requestIdRef.current
    setState((previous) => ({
      ...previous,
      loading: true,
      error: null,
      warning: null,
    }))

    try {
      const data = await Promise.race([
        query(),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('DB 응답 시간이 초과되었습니다.')), timeoutMs)
        }),
      ])
      // 더 최신 요청이 시작됐거나 언마운트됐으면 무시 (오래된 응답이 새 상태를 덮어쓰지 않도록)
      if (myRequestId !== requestIdRef.current || !mountedRef.current) return
      setState({ data, loading: false, error: null, warning: null })
    } catch (error) {
      if (myRequestId !== requestIdRef.current || !mountedRef.current) return
      setState((previous) => previous.data !== null
        ? { ...previous, loading: false, error: null, warning: error }
        : { data: initialData, loading: false, error, warning: null })
    }
  }, deps)

  useEffect(() => { load() }, [load])
  return { ...state, retry: load }
}
