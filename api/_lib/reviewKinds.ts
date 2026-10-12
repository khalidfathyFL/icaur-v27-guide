import type { Db } from 'mongodb'
import type { ReviewKind } from './ownerReviews.js'

/** The things owners can review, and where each kind's reviews live. */

export const PART_REVIEWS: ReviewKind = {
  collection: 'partReviews',
  targetCollection: 'parts',
  fields: { id: 'partId', name: 'partName', slug: 'partSlug' },
  auditKind: 'part',
  actions: {
    created: 'part_review.created',
    approved: 'part_review.approved',
    rejected: 'part_review.rejected',
    deleted: 'part_review.deleted',
  },
  noun: 'Accessory',
}

export const CENTER_REVIEWS: ReviewKind = {
  collection: 'centerReviews',
  targetCollection: 'centers',
  fields: { id: 'centerId', name: 'centerName', slug: 'centerSlug' },
  auditKind: 'center',
  actions: {
    created: 'center_review.created',
    approved: 'center_review.approved',
    rejected: 'center_review.rejected',
    deleted: 'center_review.deleted',
  },
  noun: 'Protection center',
}

/** Indexes for one kind, including the unique one: an owner reviews each thing once. */
export function reviewIndexes(db: Db, kind: ReviewKind): Promise<string>[] {
  const reviews = db.collection(kind.collection)
  return [
    reviews.createIndex({ [kind.fields.id]: 1, status: 1, createdAt: -1 }),
    reviews.createIndex({ status: 1, createdAt: -1 }),
    reviews.createIndex({ [kind.fields.id]: 1, authorId: 1 }, { unique: true }),
  ]
}
