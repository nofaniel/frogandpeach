import { AdminPanel } from './features/admin/AdminPanel'
import { AppShellLayout } from './features/app-shell/AppShellLayout'
import { LoginScreen } from './features/app-shell/LoginScreen'
import { PasswordSetupScreen } from './features/app-shell/PasswordSetupScreen'
import { StandalonePageView } from './features/app-shell/StandalonePageView'
import { useAppController } from './features/app-shell/useAppController'
import { HomeDashboard } from './features/home/HomeDashboard'
import { ListsWorkspace } from './features/lists/ListsWorkspace'
import { NetworkWorkspace } from './features/network/NetworkWorkspace'
import { NotesWorkspace } from './features/notes/NotesWorkspace'
import { PagesWorkspace } from './features/pages/PagesWorkspace'

function App() {
  const ctrl = useAppController()
  const { auth, shell, navigation, adminUnlock, home: homeGroup, lists: listsGroup, notes: notesGroup, pages: pagesGroup, network: networkGroup, admin, toasts: toastsGroup } = ctrl

  if (shell.screen === 'loading') {
    return <main className="loading-screen">Opening Frog & Peach...</main>
  }

  if (shell.screen === 'password-setup') {
    return (
      <PasswordSetupScreen
        session={auth.session}
        passwordSetupDraft={auth.passwordSetupDraft}
        setPasswordSetupDraft={auth.setPasswordSetupDraft}
        onSetOwnPassword={auth.setOwnPassword}
        onLogout={() => void auth.logout()}
        error={shell.error}
      />
    )
  }

  if (shell.screen === 'login') {
    return (
      <LoginScreen
        setupNeeded={auth.setupNeeded}
        loginDraft={auth.loginDraft}
        setLoginDraft={auth.setLoginDraft}
        onLogin={auth.login}
        error={shell.error}
      />
    )
  }

  const { activeTab, adminOpen, settingsOpen, setSettingsOpen, editMode, setEditMode, viewedPage, dashboardModules, publicSettings, error, busy, adminUnlockLabel, adminUnlockRemainingMs, displayName, now } = shell
  const { home } = homeGroup

  return (
    <AppShellLayout
      displayName={displayName}
      now={now}
      adminUnlockLabel={adminUnlockLabel}
      adminUnlockRemainingMs={adminUnlockRemainingMs}
      busy={busy}
      onRefresh={() => void shell.refreshAll()}
      onOpenSettings={() => setSettingsOpen((prev) => !prev)}
      onCloseSettings={() => setSettingsOpen(false)}
      onOpenAdmin={() => void navigation.openAdmin()}
      onLogout={() => void auth.logout()}
      navigationEntries={navigation.navigationEntries}
      activeTab={activeTab}
      adminOpen={adminOpen}
      settingsOpen={settingsOpen}
      editMode={editMode}
      setEditMode={setEditMode}
      onNavigate={navigation.navigate}
      error={error}
      unlockOpen={adminUnlock.unlockOpen}
      unlockDraft={adminUnlock.unlockDraft}
      setUnlockDraft={adminUnlock.setUnlockDraft}
      onUnlockAdmin={adminUnlock.unlockAdmin}
      onCancelUnlock={() => adminUnlock.setUnlockOpen(false)}
      toasts={toastsGroup.toasts}
      onDismissToast={toastsGroup.dismissToast}
    >
      {viewedPage && <StandalonePageView page={viewedPage} />}

      {!viewedPage && adminOpen && (
        <AdminPanel
          settings={admin.adminSettingsDraft}
          users={admin.users}
          modules={admin.adminModules}
          pageLinks={pagesGroup.pageLinks}
          customPages={admin.customPages}
          pageManifestWarnings={admin.pageManifestWarnings}
          cacheEntries={admin.cacheEntries}
          activityEntries={admin.activityEntries}
          deployment={admin.deployment}
          userDraft={admin.userDraft}
          onClose={() => shell.setAdminOpen(false)}
          onSettingsChange={admin.setAdminSettingsDraft}
          onSaveSettings={admin.saveSettings}
          onUseDeviceLocation={admin.useDeviceLocation}
          onAppearanceChange={admin.saveAppearance}
          onUserDraftChange={admin.setUserDraft}
          onCreateUser={admin.createUser}
          onPatchUser={admin.patchUser}
          onPatchModule={admin.patchModule}
          onBatchPatchModules={admin.batchPatchModules}
          onClearCache={admin.clearCache}
        />
      )}

      {!viewedPage && !adminOpen && activeTab === 'home' && (
        <HomeDashboard
          home={home}
          dashboardModules={dashboardModules}
          allModules={admin.adminModules}
          locationConfigured={homeGroup.locationConfigured}
          publicSettings={publicSettings}
          busy={busy}
          error={error}
          editMode={editMode}
          session={auth.session}
          onSetActiveTab={shell.setActiveTab}
          onOpenAdmin={() => void navigation.openAdmin()}
          onPatchModule={admin.patchModule}
          onBatchPatchModules={admin.batchPatchModules}
        />
      )}

      {!viewedPage && !adminOpen && activeTab === 'lists' && (
        <ListsWorkspace
          lists={listsGroup.lists}
          listTypes={homeGroup.listTypes}
          listDraft={listsGroup.listDraft}
          setListDraft={listsGroup.setListDraft}
          itemDrafts={listsGroup.itemDrafts}
          setItemDrafts={listsGroup.setItemDrafts}
          onCreateList={listsGroup.createList}
          onCreateItem={listsGroup.createItem}
          onToggleItem={listsGroup.toggleItem}
          onRemoveItem={listsGroup.removeItem}
          onRemoveList={listsGroup.removeList}
          onToggleListStar={listsGroup.toggleListStar}
        />
      )}

      {!viewedPage && !adminOpen && activeTab === 'notes' && (
        <NotesWorkspace
          notes={notesGroup.notes}
          noteDraft={notesGroup.noteDraft}
          setNoteDraft={notesGroup.setNoteDraft}
          onCreateNote={notesGroup.createNote}
          onToggleNote={notesGroup.toggleNote}
          onRemoveNote={notesGroup.removeNote}
        />
      )}

      {!viewedPage && !adminOpen && activeTab === 'pages' && (
        <PagesWorkspace
          pages={pagesGroup.pages}
          pageLinks={pagesGroup.pageLinks}
          pageDraft={pagesGroup.pageDraft}
          setPageDraft={pagesGroup.setPageDraft}
          linkDraft={pagesGroup.linkDraft}
          setLinkDraft={pagesGroup.setLinkDraft}
          onCreatePage={pagesGroup.createPage}
          onRemovePage={pagesGroup.removePage}
          onCreatePageLink={pagesGroup.createPageLink}
          onRemovePageLink={pagesGroup.removePageLink}
        />
      )}

      {!viewedPage && !adminOpen && activeTab === 'network' && (
        <NetworkWorkspace
          networkSummary={home?.network ?? null}
          fullNetwork={networkGroup.network}
          adminUnlocked={auth.session?.adminUnlocked ?? false}
          onLoadFullNetwork={networkGroup.loadFullNetwork}
          onUnlockAdmin={navigation.openAdmin}
          deployment={home?.deployment ?? null}
        />
      )}
    </AppShellLayout>
  )
}

export default App
