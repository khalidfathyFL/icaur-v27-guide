import { useEffect, useMemo, useState } from 'react'
import { Search, SearchX, X } from 'lucide-react'
import { categories, featuresByCategory, type CategoryId } from '../content'
import { CategoryIcon } from '../components/CategoryIcon'
import { FeatureGrid } from '../components/FeatureGrid'
import { PageFrame } from '../components/layout'
import { searchFeatures } from '../features/search/searchFeatures'
import { useLanguage } from '../i18n/languageContext'
import { replaceRouteQuery } from '../lib/useHashRoute'

const isCategoryId = (value: string | null): value is CategoryId =>
  categories.some((category) => category.id === value)

export function GuidesPage({ topic: initialTopic, query: initialQuery }: { topic: string | null; query: string }) {
  const { tx, pair } = useLanguage()
  const [topic, setTopic] = useState<CategoryId | null>(isCategoryId(initialTopic) ? initialTopic : null)
  const [query, setQuery] = useState(initialQuery)

  const groups = featuresByCategory()
  const total = groups.reduce((sum, group) => sum + group.features.length, 0)
  const trimmed = query.trim()

  // Keep the address bar in sync so a filtered view can be shared or bookmarked.
  useEffect(() => {
    replaceRouteQuery('/guides', { topic, q: trimmed || null })
  }, [topic, trimmed])

  const matches = useMemo(
    () =>
      trimmed
        ? searchFeatures(trimmed, Infinity).filter((feature) => !topic || feature.categoryId === topic)
        : null,
    [trimmed, topic],
  )
  const visibleGroups = groups.filter((group) => !topic || group.category.id === topic)
  const count = matches ? matches.length : visibleGroups.reduce((sum, group) => sum + group.features.length, 0)

  const clear = () => {
    setTopic(null)
    setQuery('')
  }

  return (
    <PageFrame
      eyebrow={tx('Guides', 'الأدلة')}
      title={tx('All owner guides', 'كل أدلة المالك')}
      intro={tx(
        'Each guide covers where the feature is, how to use it, when it will not work, and whether it is confirmed for your trim in Egypt.',
        'كل دليل يوضح مكان الميزة، وطريقة استخدامها، ومتى لا تعمل، وهل هي مؤكدة لفئتك في مصر.',
      )}
    >
      <div className="filter-bar">
        <label className="filter-search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tx('Filter guides, e.g. tyre, camera, استبن', 'فلتر الأدلة، مثال: إطار، كاميرا، spare')}
            aria-label={tx('Filter guides', 'فلتر الأدلة')}
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label={tx('Clear filter', 'امسح الفلتر')}>
              <X size={16} />
            </button>
          )}
        </label>

        <div className="chip-row" role="group" aria-label={tx('Topics', 'المواضيع')}>
          <button
            type="button"
            className={topic === null ? 'chip selected' : 'chip'}
            aria-pressed={topic === null}
            onClick={() => setTopic(null)}
          >
            {tx('All', 'الكل')} <span>{total}</span>
          </button>
          {groups.map(({ category, features }) => (
            <button
              key={category.id}
              type="button"
              className={topic === category.id ? 'chip selected' : 'chip'}
              aria-pressed={topic === category.id}
              onClick={() => setTopic(topic === category.id ? null : category.id)}
            >
              <CategoryIcon id={category.id} size={15} />
              {pair(category.name)} <span>{features.length}</span>
            </button>
          ))}
        </div>

        <p className="filter-count" aria-live="polite">
          {tx(`Showing ${count} of ${total} guides`, `عرض ${count} من ${total} دليل`)}
          {(topic || trimmed) && (
            <button type="button" className="link-button" onClick={clear}>
              {tx('Clear filters', 'امسح الفلاتر')}
            </button>
          )}
        </p>
      </div>

      {count === 0 ? (
        <div className="empty-state">
          <SearchX size={30} aria-hidden="true" />
          <strong>{tx('No guides match this filter', 'لا توجد أدلة تطابق هذا الفلتر')}</strong>
          <span>{tx('Try a different word or another topic.', 'جرّب كلمة أخرى أو موضوعا آخر.')}</span>
          <button type="button" className="secondary-button" onClick={clear}>
            {tx('Show all guides', 'اعرض كل الأدلة')}
          </button>
        </div>
      ) : matches ? (
        <FeatureGrid features={matches} />
      ) : (
        visibleGroups.map(({ category, features }) => (
          <section key={category.id} className="guide-category">
            <h2>
              <CategoryIcon id={category.id} size={20} />
              {pair(category.name)}
            </h2>
            <FeatureGrid features={features} />
          </section>
        ))
      )}
    </PageFrame>
  )
}
