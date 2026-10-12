import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { KeySquare, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { DataTable } from '../../components/panel/DataTable'
import { Drawer } from '../../components/panel/Drawer'
import { Avatar, EmptyState } from '../../components/panel/blocks'
import { useConfirm, useToast } from '../../components/panel/feedback'
import { useAuth } from '../../auth/authContext'
import { useShortText } from '../../i18n/languageContext'
import { api, type ApiPermissionDefinition, type ApiRole, type ApiUser } from '../../lib/api'
import { errorMessage } from '../../lib/errors'

/** `null` while closed; `'new'` for the create form, or the role being edited. */
type Editing = null | 'new' | ApiRole

/**
 * Named bundles of permissions. A role is defined once here and then given to
 * people, either from its own drawer or from an account's drawer; everyone
 * holding it gains whatever it grants, on their next request.
 */
export function Roles() {
  const tx = useShortText()
  const toast = useToast()
  const confirm = useConfirm()
  const [roles, setRoles] = useState<ApiRole[] | null>(null)
  const [definitions, setDefinitions] = useState<ApiPermissionDefinition[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Editing>(null)

  const load = useCallback(() => {
    api
      .listRoles()
      .then(({ roles: list }) => {
        setRoles(list)
        setError(null)
      })
      .catch((caught) => setError(errorMessage(caught, tx('Could not load.', 'تعذر التحميل.'))))
  }, [tx])

  useEffect(load, [load])

  useEffect(() => {
    api
      .permissionDefinitions()
      .then(({ permissions }) => setDefinitions(permissions))
      .catch(() => undefined)
  }, [])

  async function remove(role: ApiRole) {
    const members = role.members ?? 0
    const ok = await confirm({
      title: tx(`Delete the ${role.name} role?`, `حذف دور ${role.name}؟`),
      message:
        members > 0
          ? tx(
              `${members} ${members === 1 ? 'person holds' : 'people hold'} it and will lose what it grants, unless they also have it individually.`,
              `يملكه ${members} وسيفقدون ما يمنحه، ما لم يكن ممنوحا لهم بشكل فردي.`,
            )
          : tx('Nobody holds it yet.', 'لا أحد يملكه بعد.'),
      confirmLabel: tx('Delete', 'حذف'),
      tone: 'danger',
    })
    if (!ok) return

    try {
      await api.deleteRole(role.id)
      toast(tx('Role deleted.', 'تم حذف الدور.'))
      load()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not delete.', 'تعذر الحذف.')), 'error')
    }
  }

  const labelOf = (key: string) => definitions.find((definition) => definition.key === key)?.label ?? key

  const addButton = (
    <button type="button" className="panel-button primary" onClick={() => setEditing('new')}>
      <Plus size={16} aria-hidden="true" /> {tx('New role', 'دور جديد')}
    </button>
  )

  return (
    <>
      <DataTable
        rows={roles}
        rowKey={(role) => role.id}
        error={error}
        searchText={(role) => `${role.name} ${role.description ?? ''}`}
        searchPlaceholder={tx('Search roles…', 'ابحث في الأدوار…')}
        actions={addButton}
        onRowClick={(role) => setEditing(role)}
        empty={
          <EmptyState
            icon={KeySquare}
            title={tx('No roles yet', 'لا توجد أدوار بعد')}
            text={tx(
              'Create a role such as “Moderator”, tick what it may do, then give it to people.',
              'أنشئ دورا مثل «مراجع»، وحدد ما يمكنه فعله، ثم امنحه للأشخاص.',
            )}
            action={addButton}
          />
        }
        columns={[
          {
            key: 'name',
            header: tx('Role', 'الدور'),
            width: 'minmax(0, 1.6fr)',
            render: (role) => (
              <span className="panel-cell-main">
                <strong>{role.name}</strong>
                {role.description && <small>{role.description}</small>}
              </span>
            ),
          },
          {
            key: 'permissions',
            header: tx('Grants', 'يمنح'),
            width: 'minmax(0, 2fr)',
            render: (role) => (
              <span className="panel-muted">
                {role.permissions.length === 0 ? '—' : role.permissions.map(labelOf).join(', ')}
              </span>
            ),
          },
          {
            key: 'members',
            header: tx('People', 'الأشخاص'),
            width: '90px',
            render: (role) => <span className="panel-muted">{role.members ?? 0}</span>,
          },
          {
            key: 'actions',
            header: '',
            width: '96px',
            align: 'end',
            render: (role) => (
              <span className="panel-row-actions">
                <button
                  type="button"
                  className="panel-icon-button"
                  onClick={() => setEditing(role)}
                  aria-label={tx('Edit', 'تعديل')}
                  title={tx('Edit', 'تعديل')}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  className="panel-icon-button danger"
                  onClick={() => remove(role)}
                  aria-label={tx('Delete', 'حذف')}
                  title={tx('Delete', 'حذف')}
                >
                  <Trash2 size={15} />
                </button>
              </span>
            ),
          },
        ]}
      />

      {editing && (
        <RoleForm
          key={editing === 'new' ? 'new' : editing.id}
          role={editing === 'new' ? null : editing}
          definitions={definitions}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            load()
            // A new role stays open so people can be added to it straight away.
            setEditing(saved)
          }}
          onMembersChanged={load}
        />
      )}
    </>
  )
}

function RoleForm({
  role,
  definitions,
  onClose,
  onSaved,
  onMembersChanged,
}: {
  role: ApiRole | null
  definitions: ApiPermissionDefinition[]
  onClose: () => void
  onSaved: (role: ApiRole) => void
  onMembersChanged: () => void
}) {
  const tx = useShortText()
  const toast = useToast()
  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? [])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function togglePermission(key: string, granted: boolean) {
    setPermissions((current) => (granted ? [...current, key] : current.filter((item) => item !== key)))
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    const input = { name, description: description || undefined, permissions }
    try {
      const { role: saved } = role ? await api.updateRole(role.id, input) : await api.createRole(input)
      toast(role ? tx('Role updated.', 'تم تحديث الدور.') : tx('Role created.', 'تم إنشاء الدور.'))
      onSaved({ ...saved, members: role?.members ?? 0 })
    } catch (caught) {
      setError(errorMessage(caught, tx('Could not save.', 'تعذر الحفظ.')))
    } finally {
      setBusy(false)
    }
  }

  const groups = [...new Set(definitions.map((definition) => definition.group))]

  return (
    <Drawer
      open
      busy={busy}
      title={role ? tx('Edit role', 'تعديل الدور') : tx('New role', 'دور جديد')}
      subtitle={role?.name}
      onClose={onClose}
      footer={
        <div className="panel-drawer-actions">
          <button type="button" className="panel-button" disabled={busy} onClick={onClose}>
            {tx('Close', 'إغلاق')}
          </button>
          <button type="submit" form="role-form" className="panel-button primary" disabled={busy}>
            {busy ? tx('Saving…', 'جارٍ الحفظ…') : role ? tx('Save changes', 'احفظ التغييرات') : tx('Create role', 'أنشئ الدور')}
          </button>
        </div>
      }
    >
      <form id="role-form" className="auth-form wide panel-form" onSubmit={onSubmit}>
        <label>
          <span>{tx('Role name', 'اسم الدور')}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} autoFocus />
        </label>
        <label>
          <span>{tx('Description', 'الوصف')}</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={2} />
        </label>

        <section className="panel-preview">
          <p className="panel-preview-label">{tx('What this role may do', 'ما يمكن لهذا الدور فعله')}</p>
          {groups.map((group) => (
            <div className="permission-group" key={group}>
              <p className="permission-group-name">{group}</p>
              {definitions
                .filter((definition) => definition.group === group)
                .map((definition) => (
                  <label className="permission-row" key={definition.key}>
                    <input
                      type="checkbox"
                      checked={permissions.includes(definition.key)}
                      disabled={busy}
                      onChange={(event) => togglePermission(definition.key, event.target.checked)}
                    />
                    <span>
                      <strong>{definition.label}</strong>
                      <small>{definition.description}</small>
                    </span>
                  </label>
                ))}
            </div>
          ))}
        </section>

        {error && <p className="form-error">{error}</p>}
      </form>

      {role ? (
        <RoleMembers role={role} onChanged={onMembersChanged} />
      ) : (
        <p className="panel-muted">{tx('Once the role is created you can add people to it here.', 'بعد إنشاء الدور يمكنك إضافة أشخاص إليه هنا.')}</p>
      )}
    </Drawer>
  )
}

/** Who holds the role. Each tick saves immediately, like the account drawer. */
function RoleMembers({ role, onChanged }: { role: ApiRole; onChanged: () => void }) {
  const tx = useShortText()
  const toast = useToast()
  const { user: me } = useAuth()
  const [users, setUsers] = useState<ApiUser[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const load = useCallback(() => {
    api
      .listUsers()
      .then(({ users: list }) => setUsers(list))
      .catch((caught) => toast(errorMessage(caught, tx('Could not load.', 'تعذر التحميل.')), 'error'))
  }, [toast, tx])

  useEffect(load, [load])

  async function toggle(person: ApiUser, member: boolean) {
    setBusyId(person.id)
    const current = person.roleIds ?? []
    const next = member ? [...current, role.id] : current.filter((id) => id !== role.id)
    try {
      await api.updateUser(person.id, { roleIds: next })
      toast(
        member
          ? tx(`${person.name} now has ${role.name}.`, `أصبح لدى ${person.name} دور ${role.name}.`)
          : tx(`${role.name} removed from ${person.name}.`, `أزيل دور ${role.name} من ${person.name}.`),
      )
      load()
      onChanged()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not save.', 'تعذر الحفظ.')), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const needle = query.trim().toLowerCase()
  // Members first, then everyone else alphabetically; admins already hold everything.
  const rows = (users ?? [])
    .filter((person) => person.role !== 'admin')
    .filter((person) => !needle || `${person.name} ${person.email}`.toLowerCase().includes(needle))
    .sort(
      (a, b) =>
        Number((b.roleIds ?? []).includes(role.id)) - Number((a.roleIds ?? []).includes(role.id)) ||
        a.name.localeCompare(b.name),
    )

  return (
    <section className="panel-preview">
      <p className="panel-preview-label">{tx('People with this role', 'الأشخاص الذين لديهم هذا الدور')}</p>
      <label className="panel-search">
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={tx('Find a person…', 'ابحث عن شخص…')}
          aria-label={tx('Find a person', 'ابحث عن شخص')}
        />
      </label>
      {users === null && <span className="panel-skeleton" />}
      {users !== null && rows.length === 0 && <p className="panel-muted">{tx('No accounts match.', 'لا توجد حسابات مطابقة.')}</p>}
      {rows.map((person) => (
        <label className="permission-row" key={person.id}>
          <input
            type="checkbox"
            checked={(person.roleIds ?? []).includes(role.id)}
            // Nobody changes their own access, here or anywhere else.
            disabled={person.id === me?.id || busyId === person.id}
            onChange={(event) => toggle(person, event.target.checked)}
          />
          <span className="panel-cell-person">
            <Avatar name={person.name} size="sm" />
            <span className="panel-cell-main">
              <strong>{person.name}</strong>
              <small>{person.email}</small>
            </span>
          </span>
        </label>
      ))}
    </section>
  )
}
