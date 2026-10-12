import { useCallback, useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Avatar, Card, PageHeader } from '../../components/panel/blocks'
import { useToast } from '../../components/panel/feedback'
import { useAuth } from '../../auth/authContext'
import { useShortText } from '../../i18n/languageContext'
import { api, type ApiPermissionDefinition, type ApiRole, type ApiUser } from '../../lib/api'
import { errorMessage } from '../../lib/errors'
import { RoleBadge } from './Users'

/**
 * Who can do what, as one matrix: a row per account, a column per permission.
 *
 * The columns come from the server rather than being listed here, so the
 * screen describing the rules and the gate enforcing them cannot drift apart:
 * adding a permission in the API makes it appear here with its own label.
 *
 * A box ticked because of a role is shown locked: it is changed on the role,
 * and unticking it here would not take it away.
 */
export function Permissions() {
  const tx = useShortText()
  const toast = useToast()
  const { user: me } = useAuth()
  const [definitions, setDefinitions] = useState<ApiPermissionDefinition[]>([])
  const [users, setUsers] = useState<ApiUser[] | null>(null)
  const [roles, setRoles] = useState<ApiRole[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const load = useCallback(() => {
    Promise.all([api.permissionDefinitions(), api.listUsers(), api.listRoles()])
      .then(([defs, list, roleList]) => {
        setDefinitions(defs.permissions)
        setUsers(list.users)
        setRoles(roleList.roles)
        setError(null)
      })
      .catch((caught) => setError(errorMessage(caught, tx('Could not load.', 'تعذر التحميل.'))))
  }, [tx])

  useEffect(load, [load])

  async function toggle(target: ApiUser, key: string, granted: boolean) {
    setBusyId(target.id)
    const next = granted
      ? [...(target.permissions ?? []), key]
      : (target.permissions ?? []).filter((item) => item !== key)

    try {
      await api.updateUser(target.id, { permissions: next })
      toast(tx(`Updated ${target.name}.`, `تم تحديث ${target.name}.`))
      load()
    } catch (caught) {
      toast(errorMessage(caught, tx('Could not save.', 'تعذر الحفظ.')), 'error')
    } finally {
      setBusyId(null)
    }
  }

  /** Names of the person's roles that grant a permission. */
  const grantedBy = (person: ApiUser, key: string) =>
    roles
      .filter((role) => (person.roleIds ?? []).includes(role.id) && role.permissions.includes(key))
      .map((role) => role.name)

  const groups = [...new Set(definitions.map((definition) => definition.group))]
  const ordered = groups.flatMap((group) => definitions.filter((definition) => definition.group === group))
  const needle = query.trim().toLowerCase()
  // Contributors first: they are the rows that can actually be changed.
  const rows = (users ?? [])
    .filter((person) => !needle || `${person.name} ${person.email}`.toLowerCase().includes(needle))
    .sort((a, b) => Number(a.role === 'admin') - Number(b.role === 'admin') || a.name.localeCompare(b.name))

  return (
    <>
      <PageHeader
        description={tx(
          'Tick what each person may do. Admins hold every permission, and boxes ticked by a role are changed on the role, so both are fixed here. Hover a column for what it allows.',
          'حدد ما يمكن لكل شخص فعله. المشرفون يملكون كل الصلاحيات، والخانات التي يمنحها دور تُعدل من الدور، لذا كلاهما ثابت هنا. مرر المؤشر على العمود لمعرفة ما يسمح به.',
        )}
        actions={
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
        }
      />

      {error && <p className="form-error">{error}</p>}

      <Card flush>
        <div className="panel-matrix-scroll">
          <table className="panel-matrix">
            <thead>
              <tr>
                <th rowSpan={2} className="person">
                  {tx('Person', 'الشخص')}
                </th>
                {groups.map((group) => (
                  <th key={group} colSpan={definitions.filter((definition) => definition.group === group).length} className="group">
                    {group}
                  </th>
                ))}
              </tr>
              <tr>
                {ordered.map((definition) => (
                  <th key={definition.key} title={definition.description} className="permission">
                    {definition.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users === null && (
                <tr>
                  <td colSpan={ordered.length + 1}>
                    <span className="panel-skeleton" />
                  </td>
                </tr>
              )}
              {rows.map((person) => {
                const isAdmin = person.role === 'admin'
                const isSelf = person.id === me?.id
                return (
                  <tr key={person.id}>
                    <th scope="row" className="person">
                      <span className="panel-cell-person">
                        <Avatar name={person.name} size="sm" />
                        <span className="panel-cell-main">
                          <strong>{person.name}</strong>
                          <RoleBadge user={person} />
                        </span>
                      </span>
                    </th>
                    {ordered.map((definition) => {
                      const via = isAdmin ? [] : grantedBy(person, definition.key)
                      const direct = (person.permissions ?? []).includes(definition.key)
                      return (
                        <td key={definition.key} className={via.length > 0 ? 'via-role' : undefined}>
                          <input
                            type="checkbox"
                            aria-label={`${person.name}: ${definition.label}`}
                            title={via.length > 0 ? tx(`From role: ${via.join(', ')}`, `من الدور: ${via.join('، ')}`) : undefined}
                            checked={isAdmin || direct || via.length > 0}
                            // An admin already holds everything, a role's grants are edited on the role,
                            // and nobody edits their own permissions.
                            disabled={isAdmin || isSelf || busyId === person.id || (via.length > 0 && !direct)}
                            onChange={(event) => toggle(person, definition.key, event.target.checked)}
                          />
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
