import { useState } from 'react'
import type { GalleryStatus } from '../../../shared/api-types'

export function GallerySection({
  status,
  onConnect,
  onSetFolder,
  onDisconnect,
}: {
  status: GalleryStatus
  onConnect: () => void
  onSetFolder: (folderId: string, folderName: string) => void
  onDisconnect: () => void
}) {
  if (!status.configured) {
    return (
      <article className="panel">
        <p className="kicker">Gallery</p>
        <h2>Google Drive</h2>
        <p className="gallery-admin-note">Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and TOKEN_ENC_KEY in your environment to enable the gallery module.</p>
      </article>
    )
  }

  if (!status.connected) {
    return (
      <article className="panel">
        <p className="kicker">Gallery</p>
        <h2>Google Drive</h2>
        <p>Connect a Google account to display photos from Google Drive.</p>
        <button type="button" className="primary" onClick={onConnect}>Connect Google Drive</button>
      </article>
    )
  }

  return (
    <article className="panel">
      <p className="kicker">Gallery</p>
      <h2>Google Drive</h2>
      <div className="stack-list">
        <div className="plain-row">
          <strong>Account</strong>
          <span>{status.email}</span>
        </div>
        <div className="plain-row">
          <strong>Folder</strong>
          <span>{status.folderName || status.folderId || 'Not set'}</span>
        </div>
      </div>
      <GalleryFolderPicker currentFolderId={status.folderId} onSetFolder={onSetFolder} />
      <button type="button" className="ghost gallery-disconnect" onClick={onDisconnect}>Disconnect</button>
    </article>
  )
}

function GalleryFolderPicker({
  currentFolderId,
  onSetFolder,
}: {
  currentFolderId: string
  onSetFolder: (folderId: string, folderName: string) => void
}) {
  const [draft, setDraft] = useState({ folderId: currentFolderId || '', folderName: '' })

  return (
    <div className="gallery-folder-picker">
      <label>
        <span>Folder ID</span>
        <input
          type="text"
          value={draft.folderId}
          placeholder="Google Drive folder ID"
          onChange={(e) => setDraft((d) => ({ ...d, folderId: e.target.value }))}
        />
      </label>
      <label>
        <span>Folder name (display only)</span>
        <input
          type="text"
          value={draft.folderName}
          placeholder="e.g. Family Photos"
          onChange={(e) => setDraft((d) => ({ ...d, folderName: e.target.value }))}
        />
      </label>
      <button
        type="button"
        className="ghost"
        disabled={!draft.folderId.trim()}
        onClick={() => onSetFolder(draft.folderId.trim(), draft.folderName.trim())}
      >
        Save folder
      </button>
    </div>
  )
}
