import { createReviewHandler } from '../_lib/ownerReviews.js'
import { CENTER_REVIEWS } from '../_lib/reviewKinds.js'

/** Owner reviews of protection centers. The rules live in `ownerReviews`. */
export const handleCenterReviews = createReviewHandler(CENTER_REVIEWS)
