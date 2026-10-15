import type { Localized } from '../../content/types'
import type { Language } from '../../i18n/translator'
import type { ApiInstaller, ChargerConnector, ChargerPhase, InstallService, InstallerPackage } from '../../lib/api'

/** Wording shared by the public charger installer pages and the admin screen. */

export const SERVICE_LABELS: Record<InstallService, Localized> = {
  'home-wallbox': { en: 'Home wall box', ar: 'شاحن جداري منزلي' },
  'site-survey': { en: 'Site survey', ar: 'معاينة الموقع' },
  'three-phase-upgrade': { en: '3-phase upgrade', ar: 'تحويل لـ 3 فاز' },
  'meter-application': { en: 'Meter paperwork', ar: 'أوراق العداد' },
  'public-station': { en: 'Stations for businesses', ar: 'محطات للشركات' },
  maintenance: { en: 'Maintenance', ar: 'الصيانة' },
  'solar-integration': { en: 'Solar charging', ar: 'الشحن بالطاقة الشمسية' },
}

export const SERVICES = Object.keys(SERVICE_LABELS) as InstallService[]

export const PHASE_LABELS: Record<ChargerPhase, Localized> = {
  '1': { en: 'Single phase', ar: '1 فاز' },
  '3': { en: 'Three phase', ar: '3 فاز' },
}

export const CONNECTOR_LABELS: Record<ChargerConnector, Localized> = {
  gbt: { en: 'GB/T', ar: 'GB/T' },
  type2: { en: 'Type 2', ar: 'Type 2' },
}

export function installerName(installer: Pick<ApiInstaller, 'name'>, language: Language): string {
  const preferred = language === 'ar' ? 'ar' : 'en'
  return installer.name[preferred] || installer.name.en || installer.name.ar
}

export function packageName(item: Pick<InstallerPackage, 'name'>, language: Language): string {
  const preferred = language === 'ar' ? 'ar' : 'en'
  return item.name[preferred] || item.name.en || item.name.ar
}

/** "7.4 kW", without trailing zeros. */
export const kw = (value: number) => `${Number(value.toFixed(1))} kW`
