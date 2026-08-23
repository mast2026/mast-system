import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import EntityList from '../components/EntityList'
import Modal from '../components/Modal'
import { ErrorState, LoadingState } from '../components/States'
import useQuery from '../hooks/useQuery'
import { getAnnouncements } from '../services/dataService'
import { descriptionOf, formatDate, titleOf } from '../utils/display'

export default function AnnouncementsScreen() {
  const [selected, setSelected] = useState(null)
  const query = useQuery(() => getAnnouncements(), [])

  return <>
    <PageHeader title="공지" description="운영 소식과 안내를 확인하세요." />
    {query.loading
      ? <LoadingState />
      : query.error
        ? <ErrorState error={query.error} retry={query.retry} />
        : <EntityList items={query.data} emptyTitle="새 공지가 없어요" onItemClick={setSelected} showStatus={false} />}
    {selected && <Modal title={titleOf(selected)} onClose={() => setSelected(null)}>
      <div className="announcement-detail">
        <p>{descriptionOf(selected)}</p>
        <time dateTime={selected.created_at}>{formatDate(selected.created_at)}</time>
      </div>
    </Modal>}
  </>
}
