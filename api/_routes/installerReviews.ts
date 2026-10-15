import { createReviewHandler } from '../_lib/ownerReviews.js'
import { INSTALLER_REVIEWS } from '../_lib/reviewKinds.js'

/** Owner reviews of charger installers. The rules live in `ownerReviews`. */
export const handleInstallerReviews = createReviewHandler(INSTALLER_REVIEWS)
