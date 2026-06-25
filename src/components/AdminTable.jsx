import { useMemo, useState } from 'react'
import { EmptyState } from './States'

export default function AdminTable({ rows = [], columns, searchPlaceholder = '검색', filters = [], getSearchText }) {
  const [search, setSearch] = useState('')
  const [filterValues, setFilterValues] = useState({})
  const [sortKey, setSortKey] = useState('')
  const [sortDir, setSortDir] = useState('asc')
  const safeRows = Array.isArray(rows) ? rows : []
  const visibleRows = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase()
    const filtered = safeRows.filter((row) => {
      const text = getSearchText ? getSearchText(row) : columns.map((column) => valueOf(row, column)).join(' ')
      const matchesSearch = !keyword || String(text ?? '').toLocaleLowerCase().includes(keyword)
      const matchesFilters = filters.every((filter) => {
        const selected = filterValues[filter.key]
        if (!selected) return true
        return String(filter.value(row) ?? '') === String(selected)
      })
      return matchesSearch && matchesFilters
    })
    if (!sortKey) return filtered
    const column = columns.find((item) => item.key === sortKey)
    return [...filtered].sort((a, b) => {
      const av = valueOf(a, column)
      const bv = valueOf(b, column)
      return String(av ?? '').localeCompare(String(bv ?? ''), 'ko') * (sortDir === 'asc' ? 1 : -1)
    })
  }, [safeRows, search, filterValues, sortKey, sortDir, columns, filters, getSearchText])

  const sort = (key) => {
    if (sortKey === key) setSortDir((dir) => dir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  return <section className="admin-table-section">
    <div className="admin-table-toolbar">
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder} />
      {filters.map((filter) => <select key={filter.key} value={filterValues[filter.key] || ''} onChange={(event) => setFilterValues((prev) => ({ ...prev, [filter.key]: event.target.value }))}>
        <option value="">{filter.label} 전체</option>
        {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>)}
    </div>
    {!visibleRows.length ? <EmptyState title="표시할 데이터가 없습니다." /> : <>
      <div className="table-wrap"><table><thead><tr>{columns.map((column) => <th key={column.key}><button type="button" onClick={() => sort(column.key)}>{column.label}{sortKey === column.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}</button></th>)}</tr></thead><tbody>{visibleRows.map((row, index) => <tr key={row.id ?? `${index}`}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : (row[column.key] ?? '-')}</td>)}</tr>)}</tbody></table></div>
      <div className="admin-mobile-cards">{visibleRows.map((row, index) => <article key={row.id ?? `${index}`}>
        {columns.map((column) => <div key={column.key}><dt>{column.label}</dt><dd>{column.render ? column.render(row) : (row[column.key] ?? '-')}</dd></div>)}
      </article>)}</div>
    </>}
  </section>
}

function valueOf(row, column) {
  if (!column) return ''
  if (column.sortValue) return column.sortValue(row)
  if (column.renderText) return column.renderText(row)
  return row[column.key]
}
