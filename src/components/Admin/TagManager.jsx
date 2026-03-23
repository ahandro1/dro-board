import { useState } from 'react'

const PRESET_COLORS = [
  '#A78BFA','#34D399','#F472B6','#FB923C','#60A5FA',
  '#FBBF24','#F87171','#2DD4BF','#818CF8','#A3E635',
]

export default function TagManager({ tags, onSave }) {
  const [list, setList] = useState(tags)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  function addTag() {
    if (!newName.trim()) return
    const tag = { id: `tag_${Date.now()}`, name: newName.trim(), color: newColor }
    const updated = [...list, tag]
    setList(updated)
    onSave(updated)
    setNewName('')
  }

  function deleteTag(id) {
    if (!confirm('Delete tag? Items with this tag will lose it.')) return
    const updated = list.filter(t => t.id !== id)
    setList(updated)
    onSave(updated)
  }

  function startEdit(tag) {
    setEditId(tag.id)
    setEditName(tag.name)
    setEditColor(tag.color)
  }

  function saveEdit() {
    const updated = list.map(t => t.id === editId ? { ...t, name: editName, color: editColor } : t)
    setList(updated)
    onSave(updated)
    setEditId(null)
  }

  return (
    <div className="admin-section">
      <h2>Tags</h2>

      {/* Add new tag */}
      <div className="settings-group">
        <label className="settings-label">Create New Tag</label>
        <div className="tag-create-row">
          <input
            className="admin-input"
            placeholder="Tag name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag()}
            style={{ flex: 1 }}
          />
          <div className="color-picker-row">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                className={`color-swatch ${newColor === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => setNewColor(c)}
                type="button"
              />
            ))}
            <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="color-custom" title="Custom color" />
          </div>
          <button className="admin-btn-primary" onClick={addTag} disabled={!newName.trim()}>Add</button>
        </div>
      </div>

      {/* Existing tags */}
      <div className="tag-list">
        {list.length === 0 && <p className="muted">No tags yet.</p>}
        {list.map(tag => (
          <div key={tag.id} className="tag-list-item">
            {editId === tag.id ? (
              <>
                <span className="tag-list-dot" style={{ background: editColor }} />
                <input
                  className="admin-input tag-edit-input"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
                <div className="color-picker-row small">
                  {PRESET_COLORS.map(c => (
                    <button key={c} className={`color-swatch ${editColor === c ? 'selected' : ''}`} style={{ background: c }} onClick={() => setEditColor(c)} />
                  ))}
                  <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="color-custom" />
                </div>
                <button className="admin-btn-small" onClick={saveEdit}>Save</button>
                <button className="admin-btn-small" onClick={() => setEditId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <span className="tag-list-dot" style={{ background: tag.color }} />
                <span className="tag-list-name">{tag.name}</span>
                <span className="tag-list-color">{tag.color}</span>
                <button className="admin-btn-small" onClick={() => startEdit(tag)}>Edit</button>
                <button className="admin-btn-small danger" onClick={() => deleteTag(tag.id)}>×</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
