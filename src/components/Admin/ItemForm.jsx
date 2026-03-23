import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const TYPE_OPTIONS = ['image','gif','video','youtube','spotify','iframe','text']

function detectType(url) {
  if (!url) return 'image'
  if (/youtu\.be|youtube\.com/.test(url)) return 'youtube'
  if (/spotify\.com/.test(url)) return 'spotify'
  if (/\.(gif)$/i.test(url)) return 'gif'
  if (/\.(mp4|webm|mov)$/i.test(url)) return 'video'
  if (/\.(jpg|jpeg|png|webp|avif|svg)$/i.test(url)) return 'image'
  if (/drive\.google\.com|lh3\.googleusercontent/.test(url)) return 'image'
  return 'iframe'
}

export default function ItemForm({ item, tags, onSave, onCancel, uploadAsset }) {
  const [form, setForm] = useState({
    type: 'image', url: '', title: '', note: '', tags: [],
    scale: 1, pinned: false, pinnedX: 0, pinnedY: 0, allowOverlap: false,
    ...item
  })
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  useEffect(() => {
    if (item) setForm({ type: 'image', url: '', title: '', note: '', tags: [], scale: 1, pinned: false, pinnedX: 0, pinnedY: 0, allowOverlap: false, ...item })
    else setForm({ type: 'image', url: '', title: '', note: '', tags: [], scale: 1, pinned: false, pinnedX: 0, pinnedY: 0, allowOverlap: false })
  }, [item])

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function handleUrlChange(e) {
    const url = e.target.value
    set('url', url)
    if (!item) set('type', detectType(url)) // auto-detect only for new items
  }

  function handleTagToggle(tagId) {
    set('tags', form.tags.includes(tagId) ? form.tags.filter(t => t !== tagId) : [...form.tags, tagId])
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const base64 = ev.target.result.split(',')[1]
        const url = await uploadAsset(file.name, base64)
        set('url', url)
        set('type', detectType(file.name))
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (e) {
      setUploadError(e.message)
      setUploading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.url && form.type !== 'text') return
    onSave(form)
  }

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        className="modal"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      >
        <div className="modal-header">
          <h3>{item ? 'Edit Item' : 'Add Item'}</h3>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          {/* Type */}
          <div className="form-group">
            <label>Type</label>
            <div className="type-pills">
              {TYPE_OPTIONS.map(t => (
                <button
                  key={t}
                  type="button"
                  className={`type-pill ${form.type === t ? 'active' : ''}`}
                  onClick={() => set('type', t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* URL / Upload */}
          {form.type !== 'text' && (
            <div className="form-group">
              <label>URL</label>
              <input
                className="admin-input"
                placeholder={
                  form.type === 'youtube' ? 'https://youtube.com/watch?v=…' :
                  form.type === 'spotify' ? 'https://open.spotify.com/track/…' :
                  form.type === 'iframe'  ? 'https://…' :
                  'https://… or upload below'
                }
                value={form.url}
                onChange={handleUrlChange}
              />
              {['image','gif','video'].includes(form.type) && (
                <div className="upload-row">
                  <span className="upload-or">or</span>
                  <label className="upload-btn">
                    {uploading ? 'Uploading…' : 'Upload file'}
                    <input type="file" accept={form.type === 'video' ? 'video/*' : form.type === 'gif' ? 'image/gif' : 'image/*'} onChange={handleFileUpload} hidden />
                  </label>
                  {uploadError && <span className="form-error">{uploadError}</span>}
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div className="form-group">
            <label>Title <span className="optional">(optional)</span></label>
            <input className="admin-input" placeholder="e.g. Brutalist staircase" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>

          {/* Note */}
          <div className="form-group">
            <label>Note <span className="optional">(optional)</span></label>
            <textarea className="admin-input admin-textarea" placeholder="Your personal note…" value={form.note} onChange={e => set('note', e.target.value)} rows={3} />
          </div>

          {/* Tags */}
          <div className="form-group">
            <label>Tags</label>
            <div className="tag-picker">
              {tags.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={`tag-pick-btn ${form.tags.includes(t.id) ? 'selected' : ''}`}
                  style={form.tags.includes(t.id) ? { background: t.color + '22', borderColor: t.color, color: t.color } : {}}
                  onClick={() => handleTagToggle(t.id)}
                >
                  <span className="tag-pick-dot" style={{ background: t.color }} />
                  {t.name}
                </button>
              ))}
              {tags.length === 0 && <p className="muted" style={{fontSize:12}}>No tags yet — create some in the Tags section.</p>}
            </div>
          </div>

          {/* Scale */}
          <div className="form-group">
            <label>Card size — <strong>{form.scale.toFixed(1)}×</strong></label>
            <input
              type="range" min="0.5" max="3" step="0.1"
              value={form.scale}
              onChange={e => set('scale', parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
              <span>0.5× small</span><span>1× default</span><span>3× large</span>
            </div>
          </div>

          {/* Pin */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={e => set('pinned', e.target.checked)}
                style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              Pin to fixed canvas position
            </label>
            {form.pinned && (
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <label style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>X</span>
                  <input
                    type="number" className="admin-input"
                    value={form.pinnedX}
                    onChange={e => set('pinnedX', parseFloat(e.target.value) || 0)}
                    style={{ marginTop: 4 }}
                  />
                </label>
                <label style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Y</span>
                  <input
                    type="number" className="admin-input"
                    value={form.pinnedY}
                    onChange={e => set('pinnedY', parseFloat(e.target.value) || 0)}
                    style={{ marginTop: 4 }}
                  />
                </label>
              </div>
            )}
            {form.pinned && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 6 }}>
                <input
                  type="checkbox"
                  checked={form.allowOverlap}
                  onChange={e => set('allowOverlap', e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Allow overlap when another card is focused
                </span>
              </label>
            )}
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
              {form.pinned
                ? form.allowOverlap
                  ? 'Pinned card stays put even if it overlaps the focused card\'s expand panels.'
                  : 'Pinned card will temporarily move out of the way when a focused card\'s expand panels overlap it.'
                : 'Leave unpinned to let the physics layout position this card automatically.'}
            </p>
          </div>

          <div className="modal-footer">
            <button type="button" className="admin-btn-secondary" onClick={onCancel}>Cancel</button>
            <button type="submit" className="admin-btn-primary" disabled={uploading}>
              {item ? 'Save Changes' : 'Add to Board'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
