import { Link } from 'react-router-dom'
import { EmptyState } from './States'
import Badge from './Badge'
import { descriptionOf, formatDate, statusOf, titleOf } from '../utils/display'
export default function EntityList({ items = [], to, onItemClick, emptyTitle, meta, showStatus = true }) {
  const safeItems = Array.isArray(items) ? items : []
  if (!safeItems.length) return <EmptyState title={emptyTitle} />
  return <div className="card-list">{safeItems.map((item) => { const body = <><div className="card-heading"><h3>{titleOf(item)}</h3>{showStatus && <Badge value={statusOf(item)} />}</div>{descriptionOf(item) && <p className="line-clamp">{descriptionOf(item)}</p>}<div className="meta">{meta ? meta(item) : formatDate(item.created_at)}</div></>; return to ? <Link className="entity-card" key={item.id} to={to(item)}>{body}</Link> : onItemClick ? <button type="button" className="entity-card entity-card-button" key={item.id} onClick={() => onItemClick(item)}>{body}</button> : <article className="entity-card" key={item.id}>{body}</article> })}</div>
}
