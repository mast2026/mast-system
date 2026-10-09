import { useEffect, useId, useRef, useState } from 'react'
import schools from '../data/member-schools.json'

export default function SchoolAutocomplete({ value, onChange, disabled }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const optionsRef = useRef(null)
  const matches = schools.filter((school) => school.replaceAll(' ', '').includes(value.replaceAll(' ', '').trim()))
  const shown = open && matches.length > 0
  useEffect(() => {
    if (shown && active >= 0) optionsRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [shown, active])
  const choose = (school) => { onChange(school); setOpen(false); setActive(-1) }
  return <div className="auth-school">
    <label htmlFor={id}>학교</label>
    <input id={id} role="combobox" value={value} autoComplete="off" placeholder="학교명을 입력하세요" required disabled={disabled}
      aria-autocomplete="list" aria-expanded={shown} aria-controls={`${id}-options`}
      aria-activedescendant={shown && active >= 0 ? `${id}-option-${active}` : undefined}
      onFocus={() => setOpen(true)} onBlur={() => { setOpen(false); setActive(-1) }}
      onChange={(event) => { onChange(event.target.value); setOpen(true); setActive(-1) }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') { setOpen(false); setActive(-1) }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); setOpen(true)
          setActive((prev) => Math.max(0, Math.min(matches.length - 1, prev + (event.key === 'ArrowDown' ? 1 : -1))))
        }
        if (event.key === 'Enter' && shown && active >= 0) { event.preventDefault(); choose(matches[active]) }
      }} />
    {shown && <ul ref={optionsRef} className="auth-school-options" id={`${id}-options`} role="listbox" aria-label="학교 선택">
      {matches.map((school, index) => <li key={school} id={`${id}-option-${index}`} role="option" aria-selected={active === index}
        onMouseDown={(event) => event.preventDefault()} onClick={() => choose(school)}>{school}</li>)}
    </ul>}
  </div>
}
