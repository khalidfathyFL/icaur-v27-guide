import { createReviewHandler } from '../_lib/ownerReviews.js'
import { PART_REVIEWS } from '../_lib/reviewKinds.js'

/** Owner reviews of accessories. The rules live in `ownerReviews`. */
export const handlePartReviews = createReviewHandler(PART_REVIEWS)
