import { useEffect, useState } from 'react'
import { api, apiConfigured, type ApiDealer, type ApiPricing } from '../../lib/api'
import { trimPricing } from '../../content/egypt'
import type { Trim } from '../../content/types'

/**
 * Live prices and dealers, with the figures committed in git as the fallback.
 *
 * The site has to stay useful when the API is cold, unreachable, or simply not
 * configured for a given build, so nothing here can leave the page blank.
 */

export type MarketData = {
  /** Price per trim, live value where one exists. */
  priceFor: (trim: Trim) => { priceEgp: number; live: boolean; updatedAt?: string }
  dealers: ApiDealer[]
  /** True while the first request is still in flight. */
  loading: boolean
  /** Set when live data was expected but could not be fetched. */
  offline: boolean
}

export function useMarketData(): MarketData {
  const [pricing, setPricing] = useState<ApiPricing[]>([])
  const [dealers, setDealers] = useState<ApiDealer[]>([])
  const [loading, setLoading] = useState(apiConfigured)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    if (!apiConfigured) return

    let cancelled = false

    // Settled rather than all: a dealer outage should not hide live prices.
    Promise.allSettled([api.listPricing(), api.listDealers()])
      .then(([pricingResult, dealerResult]) => {
        if (cancelled) return

        if (pricingResult.status === 'fulfilled') setPricing(pricingResult.value.pricing)
        if (dealerResult.status === 'fulfilled') setDealers(dealerResult.value.dealers)

        setOffline(pricingResult.status === 'rejected' && dealerResult.status === 'rejected')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const priceFor = (trim: Trim) => {
    const live = pricing.find((entry) => entry.trim === trim)
    if (live) return { priceEgp: live.priceEgp, live: true, updatedAt: live.updatedAt }

    const fallback = trimPricing.find((entry) => entry.trim === trim)
    return { priceEgp: fallback?.priceEgp ?? 0, live: false }
  }

  return { priceFor, dealers, loading, offline }
}
