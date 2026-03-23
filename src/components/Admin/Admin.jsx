import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGitHub } from '../../hooks/useGitHub'
import ItemForm from './ItemForm'
import TagManager from './TagManager'
import DriveSync from './DriveSync'
import Board from '../Board/Board'
import './Admin.css'

const SECTIONS = ['items', 'tags', 'sync', 'settings', 'board']

export default function Admin({ data, setData }) {
  const [section, setSection] = useState('items')
  const [token, setToken] = useState(() => localStorage.getItem('drosboard_gh_token') || '')
  const [tokenInput, setTokenInput] = useState('')
  const [tokenStatus, setTokenStatus] = useState(null) // null | 'ok' | 'error'
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [showItemForm, setShowItemForm] = useState(false)
  const [search, setSearch] = useState('')

  const { saveContent, testToken, uploadAsset } = useGitHub()

  // Password settings
  const [pwEnabled, setPwEnabled] = useState(data?.settings?.passwordEnabled || false)
  const [pwInput, setPwInput] = useState('')

  async function handleTestToken() {
    try {
      await testToken()
      setTokenStatus('ok')
      setSaveMsg('Token connected ✓')
      setTimeout(() => setSaveMsg(null), 3000)
    } catch (e) {
      setTokenStatus('error')
      setSaveMsg('Token error: ' + e.message)
    }
  }

  function handleSaveToken() {
    localStorage.setItem('drosboard_gh_token', tokenInput)
    setToken(tokenInput)
    setTokenInput('')
    handleTestToken()
  }

  async function pushToGitHub(newData, message) {
    setSaving(true)
    setSaveMsg('Saving…')
    try {
      await saveContent(newData, message)
      setSaveMsg('Saved ✓ — deploying…')
      setTimeout(() => setSaveMsg(null), 4000)
    } catch (e) {
      setSaveMsg('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── Items ───
  function handleAddItem(item) {
    const newItem = { ...item, id: `item_${Date.now()}`, dateAdded: new Date().toISOString().slice(0,10) }
    const newData = { ...data, items: [...data.items, newItem] }
    setData(newData)
    pushToGitHub(newData, `Add item: ${item.title || item.type}`)
    setShowItemForm(false)
  }

  function handleUpdateItem(updated) {
    const newData = { ...data, items: data.items.map(i => i.id === updated.id ? updated : i) }
    setData(newData)
    pushToGitHub(newData, `Update item: ${updated.title || updated.id}`)
    setEditingItem(null)
  }

  function handleDeleteItem(id) {
    if (!confirm('Delete this item?')) return
    const newData = { ...data, items: data.items.filter(i => i.id !== id) }
    setData(newData)
    pushToGitHub(newData, 'Delete item')
  }

  // ─── Tags ───
  function handleSaveTags(tags) {
    const newData = { ...data, tags }
    setData(newData)
    pushToGitHub(newData, 'Update tags')
  }

  // ─── Drive sync ───
  function handleSyncResult(newItems) {
    const existingIds = new Set(data.items.map(i => i.id))
    const toAdd = newItems.filter(i => !existingIds.has(i.id))
    const newData = { ...data, items: [...data.items, ...toAdd] }
    setData(newData)
    pushToGitHub(newData, `Sync ${toAdd.length} items from Google Drive`)
  }

  function handleSaveSyncSources(sources) {
    const newData = { ...data, settings: { ...data.settings, driveSyncSources: sources } }
    setData(newData)
    pushToGitHub(newData, 'Update sync sources')
  }

  function handleSaveGoogleApiKey(key) {
    const newData = { ...data, settings: { ...data.settings, googleApiKey: key } }
    setData(newData)
    pushToGitHub(newData, 'Update Google API key')
  }

  // ─── Board view edits (edit/delete from canvas) ───
  function handleBoardDataChange(action, payload) {
    if (action === 'edit') {
      const newData = { ...data, items: data.items.map(i => i.id === payload.id ? payload : i) }
      setData(newData)
      pushToGitHub(newData, `Update item: ${payload.title || payload.id}`)
    } else if (action === 'delete') {
      if (!confirm('Delete this item?')) return
      const newData = { ...data, items: data.items.filter(i => i.id !== payload) }
      setData(newData)
      pushToGitHub(newData, 'Delete item')
    }
  }

  // ─── Password toggle ───
  async function handleTogglePassword(enabled) {
    let hash = data.settings.passwordHash
    if (enabled && pwInput) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pwInput))
      hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
    }
    const newData = { ...data, settings: { ...data.settings, passwordEnabled: enabled, passwordHash: hash } }
    setData(newData)
    pushToGitHub(newData, `${enabled ? 'Enable' : 'Disable'} password gate`)
    setPwEnabled(enabled)
  }

  const filteredItems = data?.items?.filter(item =>
    !search || [item.title, item.note, item.type].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  ) || []

  return (
    <div className="admin">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-logo">Admin</div>
        <nav className="admin-nav">
          {SECTIONS.map(s => (
            <button key={s} className={`admin-nav-btn ${section === s ? 'active' : ''}`} onClick={() => setSection(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </nav>

        {/* GitHub status */}
        <div className="admin-gh-status">
          <div className={`gh-dot ${token ? (tokenStatus === 'error' ? 'error' : 'ok') : 'none'}`} />
          <span>{token ? (tokenStatus === 'error' ? 'Token error' : 'GitHub connected') : 'No token'}</span>
        </div>

        {saveMsg && (
          <div className={`admin-save-msg ${saveMsg.startsWith('Error') ? 'error' : ''}`}>
            {saveMsg}
          </div>
        )}
      </aside>

      {/* Main */}
      <main className={`admin-main${section === 'board' ? ' admin-main--board' : ''}`}>
        {/* Items section */}
        {section === 'items' && (
          <div className="admin-section">
            <div className="admin-section-header">
              <h2>Items <span className="admin-count">{data?.items?.length || 0}</span></h2>
              <div className="admin-section-actions">
                <input
                  className="admin-search"
                  placeholder="Search items…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <button className="admin-btn-primary" onClick={() => { setEditingItem(null); setShowItemForm(true) }}>
                  + Add Item
                </button>
              </div>
            </div>

            <div className="admin-items-grid">
              {filteredItems.map(item => (
                <AdminItemCard
                  key={item.id}
                  item={item}
                  tags={data.tags}
                  onEdit={() => { setEditingItem(item); setShowItemForm(true) }}
                  onDelete={() => handleDeleteItem(item.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tags section */}
        {section === 'tags' && (
          <TagManager tags={data?.tags || []} onSave={handleSaveTags} />
        )}

        {/* Sync section */}
        {section === 'sync' && (
          <DriveSync
            sources={data?.settings?.driveSyncSources || []}
            googleApiKey={data?.settings?.googleApiKey || ''}
            existingItems={data?.items || []}
            onSyncResult={handleSyncResult}
            onSaveSources={handleSaveSyncSources}
            onSaveApiKey={handleSaveGoogleApiKey}
          />
        )}

        {/* Board view section */}
        {section === 'board' && (
          <Board data={data} adminMode={true} onDataChange={handleBoardDataChange} />
        )}

        {/* Settings section */}
        {section === 'settings' && (
          <div className="admin-section">
            <h2>Settings</h2>

            {/* GitHub token */}
            <div className="settings-group">
              <label className="settings-label">GitHub Personal Access Token</label>
              <p className="settings-desc">Used to save changes to your board. Stored in browser only.</p>
              {token && (
                <div className="settings-token-current">
                  Current token: <code>•••••••••{token.slice(-6)}</code>
                  <button className="settings-link" onClick={() => { localStorage.removeItem('drosboard_gh_token'); setToken(''); setTokenStatus(null) }}>Remove</button>
                </div>
              )}
              <div className="settings-row">
                <input
                  className="admin-input"
                  type="password"
                  placeholder="github_pat_…"
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                />
                <button className="admin-btn-primary" onClick={handleSaveToken} disabled={!tokenInput}>Save & Test</button>
              </div>
            </div>

            {/* Password gate */}
            <div className="settings-group">
              <label className="settings-label">Password Protection</label>
              <p className="settings-desc">When enabled, visitors must enter a password to view the board.</p>
              <div className="settings-row">
                <label className="toggle-wrap">
                  <input
                    type="checkbox"
                    checked={pwEnabled}
                    onChange={e => setPwEnabled(e.target.checked)}
                  />
                  <span className="toggle-track">
                    <span className="toggle-thumb" />
                  </span>
                  <span>{pwEnabled ? 'Enabled' : 'Disabled'}</span>
                </label>
              </div>
              {pwEnabled && (
                <div className="settings-row">
                  <input
                    className="admin-input"
                    type="password"
                    placeholder="Set new password"
                    value={pwInput}
                    onChange={e => setPwInput(e.target.value)}
                  />
                  <button className="admin-btn-primary" onClick={() => handleTogglePassword(true)}>
                    Save Password
                  </button>
                </div>
              )}
              {!pwEnabled && data?.settings?.passwordEnabled && (
                <button className="admin-btn-secondary" onClick={() => handleTogglePassword(false)}>
                  Disable password gate
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Item Form Modal */}
      <AnimatePresence>
        {showItemForm && (
          <ItemForm
            item={editingItem}
            tags={data?.tags || []}
            onSave={editingItem ? handleUpdateItem : handleAddItem}
            onCancel={() => { setShowItemForm(false); setEditingItem(null) }}
            uploadAsset={uploadAsset}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function AdminItemCard({ item, tags, onEdit, onDelete }) {
  const itemTags = tags.filter(t => item.tags?.includes(t.id))
  const thumb = item.type === 'youtube'
    ? `https://img.youtube.com/vi/${item.url?.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]}/mqdefault.jpg`
    : ['image','gif'].includes(item.type) ? item.url : null

  return (
    <div className="admin-item-card">
      <div className="admin-item-thumb">
        {thumb
          ? <img src={thumb} alt="" onError={e => e.target.style.display='none'} />
          : <div className="admin-item-thumb-placeholder">{item.type}</div>
        }
      </div>
      <div className="admin-item-info">
        <p className="admin-item-title">{item.title || <em className="muted">Untitled</em>}</p>
        <p className="admin-item-type">
          {item.type}
          {item.scale && item.scale !== 1 ? ` · ${item.scale}×` : ''}
          {item.pinned ? ' · 📌' : ''}
        </p>
        {itemTags.length > 0 && (
          <div className="admin-item-tags">
            {itemTags.map(t => (
              <span key={t.id} className="admin-tag-chip" style={{ background: t.color + '22', color: t.color, borderColor: t.color + '44' }}>
                {t.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="admin-item-actions">
        <button className="admin-btn-small" onClick={onEdit}>Edit</button>
        <button className="admin-btn-small danger" onClick={onDelete}>×</button>
      </div>
    </div>
  )
}
