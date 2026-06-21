import { useState } from 'react'
import type { GalleryStatus } from '../../../shared/api-types'

export function GallerySection({
  status,
  onSaveConfig,
  onConnect,
  onSetFolder,
  onDisconnect,
}: {
  status: GalleryStatus
  onSaveConfig: (clientId: string, clientSecret: string) => void
  onConnect: () => void
  onSetFolder: (folderId: string, folderName: string) => void
  onDisconnect: () => void
}) {
  if (!status.configured) {
    return (
      <article className="panel">
        <p className="kicker">Gallery</p>
        <h2>Google Drive</h2>
        <p className="gallery-admin-note">
          Connect a Google account to display photos from Google Drive. First, enter your OAuth credentials.
          You can get these from the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Google Cloud Console</a>.
        </p>
        <GallerySetupForm onSave={onSaveConfig} />
      </article>
    )
  }

  if (!status.connected) {
    return (
      <article className="panel">
        <p className="kicker">Gallery</p>
        <h2>Google Drive</h2>
        <p>OAuth credentials saved. Connect a Google account to display photos.</p>
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

function GallerySetupForm({ onSave }: { onSave: (clientId: string, clientSecret: string) => void }) {
  const [draft, setDraft] = useState({ clientId: '', clientSecret: '' })

  return (
    <div className="gallery-folder-picker">
      <label>
        <span>Client ID</span>
        <input
          type="text"
          value={draft.clientId}
          placeholder="xxx.apps.googleusercontent.com"
          onChange={(e) => setDraft((d) => ({ ...d, clientId: e.target.value }))}
        />
      </label>
      <label>
        <span>Client Secret</span>
        <input
          type="password"
          value={draft.clientSecret}
          placeholder="GOCSPX-..."
          onChange={(e) => setDraft((d) => ({ ...d, clientSecret: e.target.value }))}
        />
      </label>
      <button
        type="button"
        className="ghost"
        disabled={!draft.clientId.trim() || !draft.clientSecret.trim()}
        onClick={() => onSave(draft.clientId.trim(), draft.clientSecret.trim())}
      >
        Save credentials
      </button>
    </div>
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
