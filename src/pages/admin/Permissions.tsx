import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useLanguage } from '../../i18n/languageContext'
import { useAuth } from '../../auth/authContext'
import { ApiError, api, type ApiPermissionDefinition, type ApiUser } from '../../lib/api'

/**
 * Who can do what.
 *
 * The rows come from the server rather than being listed here, so the screen
 * describing the rules and the gate enforcing them cannot drift apart: adding
 * a permission in the API makes it appear here with its own label and blurb.
 */
export function Permissions() {
  const { tx } = useLanguage()
  const { user: me } = useAuth()
  const [definitions, setDefinitions] = useState<ApiPermissionDefinition[]>([])
  const [users, setUsers] = useState<ApiUser[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    Promise.all([api.permissionDefinitions(), api.listUsers()])
      .then(([defs, list]) => {
        setDefinitions(defs.permissions)
        setUsers(list.users)
      })
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : 'Could not load.'),
      )
  }, [])

  useEffect(load, [load])

  async function toggle(target: ApiUser, key: string, granted: boolean) {
    setBusyId(target.id)
    setError(null)

    const next = granted
      ? [...(target.permissions ?? []), key]
      : (target.permissions ?? []).filter((item) => item !== key)

    try {
      await api.updateUser(target.id, { permissions: next })
      load()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tx('Could not save.', 'تعذر الحفظ.'))
    } finally {
      setBusyId(null)
    }
  }

  const groups = [...new Set(definitions.map((definition) => definition.group))]

  return (
    <>
      {error && <p className="form-error">{error}</p>}

      <p className="muted-note">
        {tx(
          'Tick what each person may do. Admins hold every permission and their boxes are fixed, which is what lets them grant anything to anyone.',
          'حدد ما يمكن لكل شخص فعله. المشرفون يملكون كل الصلاحيات وخاناتهم ثابتة، وهذا ما يتيح لهم منح أي صلاحية لأي شخص.',
        )}
      </p>

      {users.map((person) => {
        const isAdmin = person.role === 'admin'
        const isSelf = person.id === me?.id

        return (
          <section className="permission-card" key={person.id}>
            <header>
              <div>
                <strong>{person.name}</strong>
                <small>{person.email}</small>
              </div>
              <span className={`badge ${isAdmin ? 'ok' : 'export'}`}>
                {isAdmin ? (
                  <>
                    <ShieldCheck size={13} /> {tx('Admin', 'مشرف')}
                  </>
                ) : (
                  tx('Contributor', 'مساهم')
                )}
              </span>
            </header>

            {groups.map((group) => (
              <div className="permission-group" key={group}>
                <p className="permission-group-name">{group}</p>
                {definitions
                  .filter((definition) => definition.group === group)
                  .map((definition) => {
                    const granted = isAdmin || (person.permissions ?? []).includes(definition.key)
                    return (
                      <label className="permission-row" key={definition.key}>
                        <input
                          type="checkbox"
                          checked={granted}
                          // An admin already holds everything, and nobody edits
                          // their own permissions.
                          disabled={isAdmin || isSelf || busyId === person.id}
                          onChange={(event) => toggle(person, definition.key, event.target.checked)}
                        />
                        <span>
                          <strong>{definition.label}</strong>
                          <small>{definition.description}</small>
                        </span>
                      </label>
                    )
                  })}
              </div>
            ))}
          </section>
        )
      })}
    </>
  )
}
