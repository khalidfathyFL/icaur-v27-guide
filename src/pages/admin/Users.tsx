import { useCallback, useEffect, useState } from 'react'
import { Ban, ShieldCheck, ShieldOff, UserCheck, Users as UsersIcon } from 'lucide-react'
import { DataTable } from '../../components/panel/DataTable'
import { Drawer } from '../../components/panel/Drawer'
import { Avatar, DetailList, EmptyState, FilterSelect } from '../../components/panel/blocks'
import { useConfirm, useToast } from '../../components/panel/feedback'
import { useAuth } from '../../auth/authContext'
import { useLanguage, useShortText } from '../../i18n/languageContext'
import { api, type ApiPermissionDefinition, type ApiUser } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { formatDate } from '../../lib/format'
import { useOpenRecord } from './useOpenRecord'

const TRIM_LABELS: Record<string, string> = { play: 'Play RWD', wild: 'Wild AWD' }

type RoleFilter = 'all' | 'admin' | 'user'
type StatusFilter = 'all' | 'active' | 'blocked'

export function RoleBadge({ user }: { user: ApiUser }) {
  const tx = useShortText()
  if (user.role === 'admin') {
    return (
      <span className="badge ok">
        <ShieldCheck size={13} aria-hidden="true" /> {tx('Admin', 'مشرف')}
      </span>
    )
  }
  const granted = user.permissions?.length ?? 0
  return (
    <span className="badge export">
      {granted > 0 ? tx(`Contributor +${granted}`, `مساهم +${granted}`) : tx('Contributor', 'مساهم')}
    </span>
  )
}

export function Users({ params }: { params: URLSearchParams }) {
  const { language } = useLanguage()
  const tx = useShortText()
  const { user: me } = useAuth()
  const record = useOpenRecord('/admin/users', params)
  const [users, setUsers] = useState<ApiUser[] | null>(null)
  const [definitions, setDefinitions] = useState<ApiPermissionDefinition[]>([])
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState<RoleFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')

  const load = useCallback(() => {
    api
      .listUsers()
      .then(({ users: list }) => {
        setUsers(list)
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

  const filtered =
    users?.filter(
      (person) =>
        (role === 'all' || person.role === role) && (status === 'all' || (person.status ?? 'active') === status),
    ) ?? null

  const selected = users?.find((person) => person.id === record.openId) ?? null

  return (
    <>
      <DataTable
        rows={filtered}
        rowKey={(person) => person.id}
        error={error}
        searchText={(person) => `${person.name} ${person.email} ${person.phone ?? ''} ${person.city ?? ''}`}
        searchPlaceholder={tx('Search name, email or phone…', 'ابحث بالاسم أو البريد أو الهاتف…')}
        filters={
          <>
            <FilterSelect<RoleFilter>
              label={tx('Role', 'الدور')}
              value={role}
              onChange={setRole}
              options={[
                { value: 'all', label: tx('All roles', 'كل الأدوار') },
                { value: 'admin', label: tx('Admins', 'المشرفون') },
                { value: 'user', label: tx('Contributors', 'المساهمون') },
              ]}
            />
            <FilterSelect<StatusFilter>
              label={tx('Status', 'الحالة')}
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: tx('Any status', 'أي حالة') },
                { value: 'active', label: tx('Active', 'نشط') },
                { value: 'blocked', label: tx('Blocked', 'محظور') },
              ]}
            />
          </>
        }
        onRowClick={(person) => record.open(person.id)}
        empty={<EmptyState icon={UsersIcon} title={tx('No accounts match', 'لا توجد حسابات مطابقة')} />}
        columns={[
          {
            key: 'person',
            header: tx('Person', 'الشخص'),
            width: 'minmax(0, 2.4fr)',
            render: (person) => (
              <span className="panel-cell-person">
                <Avatar name={person.name} size="sm" />
                <span className="panel-cell-main">
                  <strong>
                    {person.name}
                    {person.id === me?.id ? ` (${tx('you', 'أنت')})` : ''}
                  </strong>
                  <small>{person.email}</small>
                </span>
              </span>
            ),
          },
          {
            key: 'place',
            header: tx('Location', 'المكان'),
            width: 'minmax(0, 1.2fr)',
            render: (person) => <span className="panel-muted">{[person.city, person.country].filter(Boolean).join(', ') || '—'}</span>,
          },
          {
            key: 'trim',
            header: tx('Trim', 'الفئة'),
            width: '110px',
            render: (person) => <span className="panel-muted">{person.trim ? TRIM_LABELS[person.trim] : '—'}</span>,
          },
          { key: 'role', header: tx('Role', 'الدور'), width: '150px', render: (person) => <RoleBadge user={person} /> },
          {
            key: 'status',
            header: tx('Status', 'الحالة'),
            width: '100px',
            render: (person) =>
              person.status === 'blocked' ? (
                <span className="badge no">{tx('Blocked', 'محظور')}</span>
              ) : (
                <span className="panel-status-dot">{tx('Active', 'نشط')}</span>
              ),
          },
          {
            key: 'joined',
            header: tx('Joined', 'انضم'),
            width: '120px',
            render: (person) => <span className="panel-muted">{formatDate(person.createdAt, language)}</span>,
          },
        ]}
      />

      {selected && (
        <UserDrawer
          key={selected.id}
          person={selected}
          isSelf={selected.id === me?.id}
          definitions={definitions}
          onClose={record.close}
          onChanged={load}
        />
      )}
    </>
  )
}

function UserDrawer({
  person,
  isSelf,
  definitions,
  onClose,
  onChanged,
}: {
  person: ApiUser
  isSelf: boolean
  definitions: ApiPermissionDefinition[]
  onClose: () => void
  onChanged: () => void
}) {
  const { language } = useLanguage()
  const tx = useShortText()
  const toast = useToast()
  const confirm = useConfirm()
  const [busy, setBusy] = useState(false)
  const isAdmin = person.role === 'admin'
  const blocked = person.status === 'blocked'

  async function update(change: Parameters<typeof api.updateUser>[1], done: string) {
    setBusy(true)
    try {
      await api.updateUser(person.id, change)
      toast(done)
      onChanged()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not save.', 'تعذر الحفظ.')), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function toggleRole() {
    const ok = await confirm(
      isAdmin
        ? {
            title: tx(`Remove admin rights from ${person.name}?`, `سحب صلاحيات المشرف من ${person.name}؟`),
            message: tx('They keep only the permissions ticked below.', 'سيحتفظ فقط بالصلاحيات المحددة بالأسفل.'),
            confirmLabel: tx('Make contributor', 'اجعله مساهما'),
            tone: 'danger',
          }
        : {
            title: tx(`Make ${person.name} an admin?`, `جعل ${person.name} مشرفا؟`),
            message: tx(
              'Admins hold every permission, including managing other accounts.',
              'المشرفون يملكون كل الصلاحيات، بما فيها إدارة الحسابات الأخرى.',
            ),
            confirmLabel: tx('Make admin', 'اجعله مشرفا'),
          },
    )
    if (ok) update({ role: isAdmin ? 'user' : 'admin' }, tx('Role changed.', 'تم تغيير الدور.'))
  }

  async function toggleBlock() {
    if (!blocked) {
      const ok = await confirm({
        title: tx(`Block ${person.name}?`, `حظر ${person.name}؟`),
        message: tx('They are signed out and cannot sign in again until unblocked.', 'سيتم تسجيل خروجه ولن يستطيع الدخول حتى يُرفع الحظر.'),
        confirmLabel: tx('Block', 'حظر'),
        tone: 'danger',
      })
      if (!ok) return
    }
    update({ status: blocked ? 'active' : 'blocked' }, blocked ? tx('Account unblocked.', 'تم رفع الحظر.') : tx('Account blocked.', 'تم حظر الحساب.'))
  }

  function togglePermission(key: string, granted: boolean) {
    const current = person.permissions ?? []
    const next = granted ? [...current, key] : current.filter((item) => item !== key)
    update({ permissions: next }, tx('Permissions updated.', 'تم تحديث الصلاحيات.'))
  }

  const groups = [...new Set(definitions.map((definition) => definition.group))]

  return (
    <Drawer
      open
      busy={busy}
      title={
        <span className="panel-cell-person">
          <Avatar name={person.name} />
          {person.name}
        </span>
      }
      subtitle={person.email}
      onClose={onClose}
      footer={
        isSelf ? undefined : (
          <div className="panel-drawer-actions spread">
            <button type="button" className={blocked ? 'panel-button' : 'panel-button danger-soft'} disabled={busy} onClick={toggleBlock}>
              {blocked ? <UserCheck size={15} aria-hidden="true" /> : <Ban size={15} aria-hidden="true" />}
              {blocked ? tx('Unblock', 'رفع الحظر') : tx('Block', 'حظر')}
            </button>
            <button type="button" className="panel-button" disabled={busy} onClick={toggleRole}>
              {isAdmin ? <ShieldOff size={15} aria-hidden="true" /> : <ShieldCheck size={15} aria-hidden="true" />}
              {isAdmin ? tx('Make contributor', 'اجعله مساهما') : tx('Make admin', 'اجعله مشرفا')}
            </button>
          </div>
        )
      }
    >
      <DetailList
        rows={[
          { label: tx('Role', 'الدور'), value: <RoleBadge user={person} /> },
          {
            label: tx('Status', 'الحالة'),
            value: blocked ? <span className="badge no">{tx('Blocked', 'محظور')}</span> : tx('Active', 'نشط'),
          },
          { label: tx('Mobile', 'الموبايل'), value: person.phone ? <span dir="ltr">{person.phone}</span> : undefined },
          { label: tx('Location', 'المكان'), value: [person.city, person.country].filter(Boolean).join(', ') },
          { label: tx('Trim', 'الفئة'), value: person.trim ? TRIM_LABELS[person.trim] : undefined },
          { label: tx('Colour', 'اللون'), value: person.colour },
          { label: tx('Joined', 'انضم'), value: formatDate(person.createdAt, language) },
        ]}
      />

      <section className="panel-preview">
        <p className="panel-preview-label">{tx('Permissions', 'الصلاحيات')}</p>
        {isSelf ? (
          <p className="panel-muted">{tx('Nobody edits their own permissions, admins included.', 'لا أحد يعدل صلاحياته بنفسه، ولا حتى المشرف.')}</p>
        ) : isAdmin ? (
          <p className="panel-muted">{tx('Admins hold every permission.', 'المشرفون يملكون كل الصلاحيات.')}</p>
        ) : null}

        {groups.map((group) => (
          <div className="permission-group" key={group}>
            <p className="permission-group-name">{group}</p>
            {definitions
              .filter((definition) => definition.group === group)
              .map((definition) => (
                <label className="permission-row" key={definition.key}>
                  <input
                    type="checkbox"
                    checked={isAdmin || (person.permissions ?? []).includes(definition.key)}
                    disabled={isAdmin || isSelf || busy}
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
    </Drawer>
  )
}
