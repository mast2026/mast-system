import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
export default function PageHeader({ title, description, back = false, action }) {
  const navigate = useNavigate()
  return <div className="page-header"><div>{back && <button className="icon-button back" onClick={() => navigate(-1)} aria-label="뒤로"><ChevronLeft /></button>}<div><h1>{title}</h1>{description && <p>{description}</p>}</div></div>{action}</div>
}
