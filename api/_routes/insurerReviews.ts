import { createReviewHandler } from '../_lib/ownerReviews.js'
import { INSURER_REVIEWS } from '../_lib/reviewKinds.js'

/** Owner reviews of insurance companies. The rules live in `ownerReviews`. */
export const handleInsurerReviews = createReviewHandler(INSURER_REVIEWS)
