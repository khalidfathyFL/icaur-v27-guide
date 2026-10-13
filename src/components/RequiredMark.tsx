import { useLanguage } from '../i18n/languageContext'

/**
 * Forms mark only what must be filled in; everything unmarked is optional.
 * Fields that come in an English and an Arabic version need just one of the
 * two, and the site shows whichever was written when the other is missing.
 */

/** The red star after a required field's label. Screen readers get `aria-required` on the field instead. */
export function Req() {
  return (
    <span className="req" aria-hidden="true">
      {' *'}
    </span>
  )
}

/** One line at the top of a form explaining the star, and the either-language rule when it applies. */
export function RequiredLegend({ bilingual = false }: { bilingual?: boolean }) {
  const { tx } = useLanguage()
  return (
    <p className="form-legend">
      <span className="req" aria-hidden="true">
        *
      </span>{' '}
      {tx('Required. Everything else is optional.', 'مطلوب. كل ما عداه اختياري.')}
      {bilingual &&
        ` ${tx(
          'For English/Arabic pairs, one language is enough; the other side shows it until both are written.',
          'في الحقول الإنجليزية/العربية تكفي لغة واحدة؛ ويُعرض المكتوب منها حتى تُكتب الأخرى.',
        )}`}
    </p>
  )
}
