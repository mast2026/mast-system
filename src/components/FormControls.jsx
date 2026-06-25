import LoadingCloud from './common/LoadingCloud'

export function Field({ label, required, hint, children }) {
  return <label className="form-field"><span>{label}{required && <b> *</b>}</span>{children}{hint && <small>{hint}</small>}</label>
}

export function TagSelector({ label, options, value = [], onChange, max, hashtag = false }) {
  const safeValue = Array.isArray(value) ? value : []; const safeOptions = Array.isArray(options) ? options : []
  const toggle = (tag) => { if (safeValue.includes(tag)) onChange(safeValue.filter((x) => x !== tag)); else if (!max || safeValue.length < max) onChange([...safeValue, tag]) }
  return <fieldset className={`tag-field${hashtag ? ' hashtag-field' : ''}`}><legend>{label}</legend><div className="tag-options">{safeOptions.map((tag) => <button type="button" key={tag} className={safeValue.includes(tag) ? 'selected' : ''} onClick={() => toggle(tag)}>{hashtag ? `#${tag}` : tag}</button>)}</div>{max && <small>최대 {max}개 · {safeValue.length}/{max}</small>}</fieldset>
}

export function FormActions({ submitting, submitLabel = '저장하기', onCancel }) {
  return <div className="form-actions">{onCancel && <button type="button" className="button secondary" onClick={onCancel}>취소</button>}<button type="submit" className="button primary" disabled={submitting}>{submitting ? <LoadingCloud size="small" text="저장 중..." /> : submitLabel}</button></div>
}
