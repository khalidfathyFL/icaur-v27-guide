import { comparison, imageUrls, specs } from '../content'
import { AltBlock, PageFrame, SectionHeading } from '../components/layout'
import { useLanguage } from '../i18n/languageContext'

export function SpecsPage() {
  const { t, alt, pair, tx } = useLanguage()

  return (
    <PageFrame
      eyebrow={tx('Specs', 'المواصفات')}
      title={tx('V27 Core Specs With Verification Notes', 'مواصفات V27 الأساسية مع ملاحظات تحقق')}
      intro={tx(
        'The numbers below are based on the brief and official export-market sources. They should be updated when Egypt owner documentation is available.',
        'الأرقام أدناه مبنية على brief ومصادر تصدير رسمية وتحتاج تحديثا عند توفر وثائق مصر.',
      )}
    >
      <div className="spec-grid">
        {specs.map((spec) => {
          const noteAlt = alt(spec.note)
          return (
            <div className="spec-card" key={spec.id}>
              <span>{pair(spec.label)}</span>
              <strong>{t(spec.value)}</strong>
              <small>{t(spec.note)}</small>
              {noteAlt && (
                <AltBlock>
                  <small>{noteAlt}</small>
                </AltBlock>
              )}
            </div>
          )
        })}
      </div>

      <section className="split-section specs-image">
        <div>
          <SectionHeading
            eyebrow="REEV"
            title={tx('Daily Electric Drive, Longer Range', 'كهرباء يومية ومدى أطول')}
            compact
          />
          <p>
            {tx(
              'V27 is a range-extender EV: the wheels are driven electrically, while the petrol engine generates electricity when needed.',
              'V27 يعمل بنظام مدى ممتد: الحركة عبر الموتور الكهربائي، ومحرك البنزين يعمل كمولد للطاقة عند الحاجة.',
            )}
          </p>
        </div>
        <img src={imageUrls.rear} alt={tx('iCAUR V27 rear view', 'iCAUR V27 من الخلف')} />
      </section>
    </PageFrame>
  )
}

export function ComparePage() {
  const { pair, tx } = useLanguage()

  return (
    <PageFrame
      eyebrow={tx('Comparison', 'المقارنة')}
      title={tx('Play RWD vs Wild AWD', 'Play مقابل Wild')}
      intro={tx(
        'This is an initial comparison designed to be updated when official Egypt documentation or real trim photos are available.',
        'المقارنة مبدئية ويتم تحديثها عند توفر وثائق مصر الرسمية.',
      )}
    >
      <div className="comparison-table" role="table">
        <div className="table-row table-head" role="row">
          <span>{tx('Item', 'البند')}</span>
          <span>Play Egypt</span>
          <span>Wild Egypt</span>
        </div>
        {comparison.map((row) => (
          <div className="table-row" role="row" key={row.label.en}>
            <span>{pair(row.label)}</span>
            <span>{row.play}</span>
            <span>{row.wild}</span>
          </div>
        ))}
      </div>
    </PageFrame>
  )
}
