import { useState } from 'react'

function parseFolderId(input) {
  // Accept full URL or just the ID
  const m = input.match(/folders\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : input.trim()
}

function getFileType(mimeType, name) {
  if (mimeType === 'image/gif' || /\.gif$/i.test(name)) return 'gif'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  return 'image'
}

export default function DriveSync({ sources, googleApiKey, existingItems, onSyncResult, onSaveSources, onSaveApiKey }) {
  const [apiKeyInput, setApiKeyInput] = useState(googleApiKey || '')
  const [newSource, setNewSource] = useState('')
  const [newSourceName, setNewSourceName] = useState('')
  const [syncing, setSyncing] = useState(null) // source id being synced
  const [syncMsg, setSyncMsg] = useState({})

  function saveApiKey() {
    onSaveApiKey(apiKeyInput)
    setSyncMsg(m => ({ ...m, api: 'Saved ✓' }))
    setTimeout(() => setSyncMsg(m => ({ ...m, api: null })), 2000)
  }

  function addSource() {
    if (!newSource.trim()) return
    const folderId = parseFolderId(newSource)
    const src = { id: `src_${Date.now()}`, name: newSourceName.trim() || folderId, folderId }
    onSaveSources([...sources, src])
    setNewSource('')
    setNewSourceName('')
  }

  function removeSource(id) {
    onSaveSources(sources.filter(s => s.id !== id))
  }

  async function syncSource(src) {
    const key = googleApiKey || apiKeyInput
    if (!key) {
      setSyncMsg(m => ({ ...m, [src.id]: 'Add a Google API key first' }))
      return
    }
    setSyncing(src.id)
    setSyncMsg(m => ({ ...m, [src.id]: 'Fetching…' }))

    try {
      const url = `https://www.googleapis.com/drive/v3/files?q='${src.folderId}'+in+parents&fields=files(id,name,mimeType)&pageSize=200&key=${key}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Drive API error: ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error.message)

      const files = data.files || []
      const existingDriveIds = new Set(existingItems.filter(i => i.driveId).map(i => i.driveId))

      const newItems = files
        .filter(f => !existingDriveIds.has(f.id))
        .map(f => ({
          id: `drive_${f.id}`,
          driveId: f.id,
          type: getFileType(f.mimeType, f.name),
          url: `https://drive.google.com/uc?export=view&id=${f.id}`,
          title: f.name.replace(/\.[^.]+$/, ''), // strip extension
          note: '',
          tags: [],
          dateAdded: new Date().toISOString().slice(0, 10),
          syncSource: src.id,
        }))

      onSyncResult(newItems)
      setSyncMsg(m => ({ ...m, [src.id]: `Added ${newItems.length} new item${newItems.length !== 1 ? 's' : ''} ✓` }))
    } catch (e) {
      setSyncMsg(m => ({ ...m, [src.id]: 'Error: ' + e.message }))
    } finally {
      setSyncing(null)
    }
  }

  return (
    <div className="admin-section">
      <h2>Google Drive Sync</h2>
      <p className="settings-desc" style={{ marginBottom: 24 }}>
        Connect a publicly-shared Google Drive folder. Hit Sync to add new files from it to your board.
        Files deleted from Drive won't be auto-removed (delete them manually in Items).
      </p>

      {/* API Key */}
      <div className="settings-group">
        <label className="settings-label">Google API Key</label>
        <p className="settings-desc">
          Free — create one at <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" style={{color:'inherit',textDecoration:'underline'}}>Google Cloud Console</a> → APIs & Services → Credentials → Create API key. Enable the Drive API.
        </p>
        <div className="settings-row">
          <input
            className="admin-input"
            type="password"
            placeholder="AIza…"
            value={apiKeyInput}
            onChange={e => setApiKeyInput(e.target.value)}
          />
          <button className="admin-btn-primary" onClick={saveApiKey}>Save</button>
        </div>
        {syncMsg.api && <p className="form-success">{syncMsg.api}</p>}
      </div>

      {/* Add source */}
      <div className="settings-group">
        <label className="settings-label">Add Drive Folder</label>
        <p className="settings-desc">Folder must be shared as "Anyone with the link can view".</p>
        <div className="settings-row">
          <input
            className="admin-input"
            placeholder="Folder name (optional)"
            value={newSourceName}
            onChange={e => setNewSourceName(e.target.value)}
            style={{ width: 160, flexShrink: 0 }}
          />
          <input
            className="admin-input"
            placeholder="https://drive.google.com/drive/folders/…"
            value={newSource}
            onChange={e => setNewSource(e.target.value)}
          />
          <button className="admin-btn-primary" onClick={addSource} disabled={!newSource.trim()}>Add</button>
        </div>
      </div>

      {/* Sources list */}
      <div className="sync-sources">
        {sources.length === 0 && <p className="muted">No sync sources added yet.</p>}
        {sources.map(src => (
          <div key={src.id} className="sync-source-row">
            <div className="sync-source-info">
              <span className="sync-source-name">{src.name}</span>
              <span className="sync-source-id">{src.folderId}</span>
            </div>
            <div className="sync-source-actions">
              {syncMsg[src.id] && <span className={`sync-msg ${syncMsg[src.id].startsWith('Error') ? 'error' : ''}`}>{syncMsg[src.id]}</span>}
              <button
                className="admin-btn-primary"
                onClick={() => syncSource(src)}
                disabled={syncing === src.id}
              >
                {syncing === src.id ? 'Syncing…' : 'Sync'}
              </button>
              <button className="admin-btn-small danger" onClick={() => removeSource(src.id)}>×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
