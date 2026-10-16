import { infotainmentMenus, type InfotainmentControl, type InfotainmentMenu } from '../../content/infotainment'
import { imageUrls } from '../../content/images'
import { useLanguage } from '../../i18n/languageContext'
import { VerificationBadge } from '../../components/VerificationBadge'
import { AltBlock } from '../../components/layout'
import { controlKey, type InfotainmentDispatch, type InfotainmentState } from './useInfotainment'
import { SpecControl } from './shared'
import { MENU_ICONS } from './screenKit'

/**
 * Settings as laid out in the manual: categories down the left, the selected
 * page's grouped cards in the middle, and the car beside them. The panel on the
 * right is ours - it explains whichever setting was touched last.
 */
export function SettingsScreen({
  state,
  dispatch,
  menu,
  control,
}: {
  state: InfotainmentState
  dispatch: InfotainmentDispatch
  menu: InfotainmentMenu
  control: InfotainmentControl | null
}) {
  const runAction = (item: InfotainmentControl, name: string) => {
    const toast = `${item.label}: ${name}`
    const key = controlKey(menu.id, item.id)

    // Commands that change something visible elsewhere on the screen.
    if (key === 'body-control.all-open') {
      const opening = { 'All open': 100, Ventilate: 15, 'All close': 0 }[name] ?? 0
      return dispatch({ type: 'all-windows', value: opening, toast })
    }
    if (key === 'body-control.mirror-fold' && (name === 'Fold') !== state.mirrorsFolded) {
      return dispatch({ type: 'toggle-mirrors' })
    }
    if (key === 'display.screen-cleaning') return dispatch({ type: 'set-overlay', overlay: 'screen-cleaning' })
    if (key === 'safety-service.power-off') return dispatch({ type: 'set-overlay', overlay: 'power-off' })
    if (key === 'general.my-vehicle') return dispatch({ type: 'run-action', toast: 'iCAUR V27 · VIN LXXXXXXXXXXXXXXXX' })
    dispatch({ type: 'run-action', toast })
  }

  return (
    <div className="ice-settings">
      <nav className="ice-settings-nav" aria-label="Settings">
        <p className="ice-settings-title">Settings</p>
        {infotainmentMenus.map((item) => {
          const Glyph = MENU_ICONS[item.icon]
          return (
            <button
              key={item.id}
              type="button"
              className={item.id === menu.id ? 'active' : ''}
              aria-current={item.id === menu.id ? 'page' : undefined}
              onClick={() => dispatch({ type: 'open-settings', menuId: item.id })}
            >
              <Glyph size={15} aria-hidden />
              <span>{item.name.en}</span>
            </button>
          )
        })}
      </nav>

      <div className="ice-settings-page" role="list" aria-label={menu.name.en}>
        {menu.controls.map((item, index) => {
          const showSection = item.section !== undefined && item.section !== menu.controls[index - 1]?.section
          const key = controlKey(menu.id, item.id)
          return (
            <div key={item.id} className="ice-settings-item" role="listitem">
              {showSection && <p className="ice-section">{item.section}</p>}
              <div className={`ice-control kind-${item.control.kind}${control?.id === item.id ? ' selected' : ''}`}>
                <button
                  type="button"
                  className="ice-control-head"
                  onClick={() => dispatch({ type: 'select-control', controlId: item.id })}
                >
                  <span>{item.label}</span>
                  <VerificationBadge status={item.status} compact />
                </button>
                <div onClickCapture={() => dispatch({ type: 'select-control', controlId: item.id })}>
                  <SpecControl
                    spec={item.control}
                    label={item.label}
                    value={state.values[key]}
                    onChange={(value, toast) => dispatch({ type: 'set-value', key, value, toast })}
                    onAction={(name) => runAction(item, name)}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <aside className="ice-settings-side">
        <img className="ice-settings-car" src={imageUrls.hero} alt="" loading="lazy" decoding="async" />
        {control ? <ControlDetail control={control} /> : <p className="ice-popover-note">{menu.subtitle.en}</p>}
      </aside>
    </div>
  )
}

function ControlDetail({ control }: { control: InfotainmentControl }) {
  const { tx, t, alt } = useLanguage()
  const descriptionAlt = alt(control.description)
  const tipAlt = control.egyptTip && alt(control.egyptTip)
  const warningAlt = control.warning && alt(control.warning)

  return (
    <div className="ice-detail">
      <p className="eyebrow">{tx('What this does', 'وظيفة الإعداد')}</p>
      <h3>{control.label}</h3>

      <p>{t(control.description)}</p>
      {descriptionAlt && (
        <AltBlock>
          <p>{descriptionAlt}</p>
        </AltBlock>
      )}

      {control.warning && (
        <div className="ice-callout warning">
          <strong>{tx('Warning', 'تحذير')}</strong>
          <p>{t(control.warning)}</p>
          {warningAlt && (
            <AltBlock>
              <p>{warningAlt}</p>
            </AltBlock>
          )}
        </div>
      )}

      {control.egyptTip && (
        <div className="ice-callout egypt">
          <strong>{tx('For Egypt', 'لمصر')}</strong>
          <p>{t(control.egyptTip)}</p>
          {tipAlt && (
            <AltBlock>
              <p>{tipAlt}</p>
            </AltBlock>
          )}
        </div>
      )}

      <div className="ice-detail-status">
        <VerificationBadge status={control.status} />
        <small>
          {control.status === 'confirmed-egypt'
            ? tx(
                'Confirmed for Egypt cars by the official V27 settings guide for Egypt.',
                'مؤكد لسيارات مصر من دليل إعدادات V27 الرسمي لمصر.',
              )
            : tx(
                'From the V27 owner’s manual (export edition). Not yet confirmed on an Egypt car.',
                'من دليل مالك V27 (نسخة التصدير). لم يتأكد بعد على سيارة مصرية.',
              )}
        </small>
      </div>
    </div>
  )
}
