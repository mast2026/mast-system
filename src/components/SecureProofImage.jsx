import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SecureProofImage({ src, path, ...props }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let cancelled = false
    const local = /^(blob:|data:)/.test(src || '')
    const resolve = async () => {
      if (local) { setUrl(src); return }
      let file = path
      if (!file && src) {
        try { file = decodeURIComponent(new URL(src).pathname.split('/proofs/')[1] || '') } catch { /* invalid URL */ }
      }
      if (!file || !supabase) { setUrl(''); return }
      const { data, error } = await supabase.storage.from('proofs').createSignedUrl(file, 900)
      if (!cancelled) setUrl(error ? '' : data?.signedUrl || '')
    }
    setUrl('')
    resolve()
    const timer = local ? null : setInterval(resolve, 600000)
    return () => { cancelled = true; if (timer) clearInterval(timer) }
  }, [src, path])
  return url ? <img {...props} src={url} /> : <span role="status">사진 확인 중...</span>
}
