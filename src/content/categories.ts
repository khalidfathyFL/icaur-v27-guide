// Generated from the bilingual owner-guide research set. Edit content here.
import type { Category } from './types'

export const categories: Category[] = [
  { id: "screen", name: { en: "Screen and system", ar: "الشاشة والنظام" } },
  { id: "adas", name: { en: "Safety and ADAS", ar: "السلامة و ADAS" } },
  { id: "energy", name: { en: "Energy and charging", ar: "الطاقة والشحن" } },
  { id: "wheels", name: { en: "Wheels and emergency", ar: "العجل والطوارئ" } },
  { id: "comfort", name: { en: "Comfort and cabin", ar: "الراحة والكابينة" } },
  { id: "exterior", name: { en: "Exterior controls", ar: "التحكم الخارجي" } },
  { id: "storage", name: { en: "Storage and utility", ar: "التخزين والاستخدام" } },
  { id: "driving", name: { en: "Driving", ar: "القيادة" } },
  { id: "maintenance", name: { en: "Maintenance", ar: "الصيانة" } },
  { id: "troubleshooting", name: { en: "Troubleshooting", ar: "استكشاف الأعطال" } },
]

export const categoryName = (id: string) => categories.find((category) => category.id === id)?.name
