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

  const adminUnlocked = sessionStorage.getItem('drosboard_admin_unlocked')

  return (
    <Routes>
      <Route path="/" element={<BoardWrapper data={data} setData={setData} />} />
      <Route path="/admin" element={
        adminUnlocked
          ? <Admin data={data} setData={setData} />
          : <PasswordGate
              hash="6d5ef1fdb68c5ab10b7c90f1796f711153c1134f75c778280bc67b1bf1d3e21c"
              storageKey="drosboard_admin_unlocked"
              onUnlock={() => window.location.reload()}
            />
      } />
    </Routes>
  )
}
