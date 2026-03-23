import { Routes, Route } from 'react-router-dom'
import { useContent } from './hooks/useContent'
import Board from './components/Board/Board'
import Admin from './components/Admin/Admin'
import PasswordGate from './components/PasswordGate/PasswordGate'

function BoardWrapper({ data, setData }) {
  if (!data) return <div className="board-loading">Loading…</div>

  if (data.settings?.passwordEnabled && !sessionStorage.getItem('drosboard_unlocked')) {
    return (
      <PasswordGate
        hash={data.settings.passwordHash}
        onUnlock={() => { sessionStorage.setItem('drosboard_unlocked', '1'); window.location.reload() }}
      />
    )
  }

  return <Board data={data} setData={setData} />
}

export default function App() {
  const { data, loading, error, setData } = useContent()

  if (loading) return <div className="board-loading">Loading…</div>
  if (error) return <div className="board-loading">Error: {error}</div>

  return (
    <Routes>
      <Route path="/" element={<BoardWrapper data={data} setData={setData} />} />
      <Route path="/admin" element={<Admin data={data} setData={setData} />} />
    </Routes>
  )
}
