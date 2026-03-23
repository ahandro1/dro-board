const REPO = 'ahandro1/Dro-s-Board'
const FILE_PATH = 'public/data/content.json'
const BRANCH = 'main'
const API = 'https://api.github.com'

function getToken() {
  return localStorage.getItem('drosboard_gh_token')
}

export function useGitHub() {
  async function readRemoteContent() {
    const token = getToken()
    if (!token) throw new Error('No GitHub token set')

    const res = await fetch(
      `${API}/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )
    if (!res.ok) throw new Error(`GitHub read failed: ${res.status}`)
    const data = await res.json()
    const content = JSON.parse(
      decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))))
    )
    return { content, sha: data.sha }
  }

  async function writeRemoteContent(content, sha, message = 'Update board content') {
    const token = getToken()
    if (!token) throw new Error('No GitHub token set')

    const encoded = btoa(
      unescape(encodeURIComponent(JSON.stringify(content, null, 2)))
    )

    const res = await fetch(
      `${API}/repos/${REPO}/contents/${FILE_PATH}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          content: encoded,
          sha,
          branch: BRANCH,
        }),
      }
    )
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || `GitHub write failed: ${res.status}`)
    }
    return res.json()
  }

  async function saveContent(newData, message) {
    const { sha } = await readRemoteContent()
    return writeRemoteContent(newData, sha, message)
  }

  async function uploadAsset(filename, base64Content) {
    const token = getToken()
    if (!token) throw new Error('No GitHub token set')

    const path = `public/assets/${filename}`

    // Check if file exists to get its SHA
    let sha
    try {
      const check = await fetch(`${API}/repos/${REPO}/contents/${path}?ref=${BRANCH}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
      })
      if (check.ok) {
        const existing = await check.json()
        sha = existing.sha
      }
    } catch (_) {}

    const body = {
      message: `Upload asset: ${filename}`,
      content: base64Content,
      branch: BRANCH,
    }
    if (sha) body.sha = sha

    const res = await fetch(`${API}/repos/${REPO}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Asset upload failed: ${res.status}`)
    const result = await res.json()
    // Return the raw GitHub Pages URL for the asset
    return `https://ahandro1.github.io/Dro-s-Board/assets/${filename}`
  }

  function testToken() {
    const token = getToken()
    if (!token) return Promise.reject(new Error('No token'))
    return fetch(`${API}/repos/${REPO}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
    }).then(r => {
      if (!r.ok) throw new Error(`Token invalid or no repo access (${r.status})`)
      return r.json()
    })
  }

  return { saveContent, uploadAsset, testToken, readRemoteContent }
}
