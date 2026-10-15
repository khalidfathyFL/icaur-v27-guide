import {
  answerDecisionEmail,
  commentDecisionEmail,
  newAnswerEmail,
  questionDecisionEmail,
  newPostEmail,
  orderEmail,
  postDecisionEmail,
  reviewDecisionEmail,
  suggestionDecisionEmail,
  welcomeEmail,
  type EmailContent,
} from './templates.js'

/**
 * Every message the site sends, filled with realistic sample data, so the
 * admin panel can show exactly what people receive and send a test of it.
 */

export type EmailSample = {
  key: string
  group: string
  name: string
  /** When the real one is sent. */
  when: string
  /** Sent to everyone, with an unsubscribe link; otherwise a reply to something the reader did. */
  broadcast?: boolean
  build: () => EmailContent
}

const POST_TITLE = 'Six months with my V27 Wild: what I would change'
const QUESTION_TITLE = 'Why does the engine start when the battery is still at 20%?'

export const EMAIL_SAMPLES: EmailSample[] = [
  { key: 'welcome', group: 'Account', name: 'Welcome', when: 'Someone registers', build: () => welcomeEmail({ owner: true }) },
  {
    key: 'post-approved',
    group: 'Posts',
    name: 'Post approved',
    when: 'A moderator approves a post (to its author)',
    build: () => postDecisionEmail({ status: 'approved', title: POST_TITLE, slug: 'six-months-v27-wild' }),
  },
  {
    key: 'post-rejected',
    group: 'Posts',
    name: 'Post not approved',
    when: 'A moderator rejects a post (to its author)',
    build: () =>
      postDecisionEmail({
        status: 'rejected',
        title: 'Best tyres for the V27?',
        slug: 'best-tyres',
        note: 'Please add the tyre sizes and where you bought them, then send it again.',
      }),
  },
  {
    key: 'new-post',
    group: 'Posts',
    name: 'New post',
    when: 'A post is published (to everyone, at most 200 a day)',
    broadcast: true,
    build: () =>
      newPostEmail({
        title: POST_TITLE,
        excerpt:
          'I picked up my Wild in April and have done 9,000 km since, half of it on the Ain Sokhna road. The range is better than I expected, the infotainment less so. Here is everything I learned.',
        authorName: 'Ahmed Samir',
        slug: 'six-months-v27-wild',
      }),
  },
  {
    key: 'comment-approved',
    group: 'Moderation',
    name: 'Comment approved',
    when: 'A comment is approved or rejected (to its author)',
    build: () => commentDecisionEmail({ status: 'approved', postTitle: 'Charging at home in Cairo', postId: 'sample' }),
  },
  {
    key: 'question-approved',
    group: 'Questions',
    name: 'Question approved',
    when: 'A question is approved or rejected (to whoever asked)',
    build: () => questionDecisionEmail({ status: 'approved', title: QUESTION_TITLE, id: 'sample' }),
  },
  {
    key: 'answer-approved',
    group: 'Questions',
    name: 'Answer approved',
    when: 'An answer is approved or rejected (to its author)',
    build: () => answerDecisionEmail({ status: 'approved', questionTitle: QUESTION_TITLE, questionId: 'sample' }),
  },
  {
    key: 'question-answered',
    group: 'Questions',
    name: 'New answer',
    when: "Someone else's answer to a question is published (to whoever asked)",
    build: () =>
      newAnswerEmail({
        questionTitle: QUESTION_TITLE,
        questionId: 'sample',
        answerAuthor: 'Mona Adel',
        excerpt: 'Mine does the same below 20%. Charge it overnight and it stops; the service center said it is the generator protecting the battery.',
      }),
  },
  {
    key: 'suggestion-approved',
    group: 'Moderation',
    name: 'Correction accepted',
    when: 'A suggested correction is decided (to whoever sent it)',
    build: () => suggestionDecisionEmail({ status: 'approved', proposed: 'The Play trim has a 14.6-inch screen, not 15.6.' }),
  },
  {
    key: 'review-approved',
    group: 'Moderation',
    name: 'Review approved',
    when: 'An accessory, center or insurer review is approved',
    build: () => reviewDecisionEmail({ status: 'approved', kind: 'center', targetName: 'Shield Pro PPF, New Cairo', targetSlug: 'shield-pro' }),
  },
  {
    key: 'review-rejected',
    group: 'Moderation',
    name: 'Review not approved',
    when: 'A review is rejected, with the moderator note',
    build: () =>
      reviewDecisionEmail({
        status: 'rejected',
        kind: 'insurer',
        targetName: 'Misr Insurance',
        targetSlug: 'misr',
        note: 'Reviews need to be about your own experience with the company.',
      }),
  },
  {
    key: 'order-new',
    group: 'Orders',
    name: 'Request received',
    when: 'Someone sends an accessory request',
    build: () => orderEmail({ number: 'IC-0042', status: 'new', itemCount: 3, totalEgp: 18750, agreedTotal: false }),
  },
  {
    key: 'order-confirmed',
    group: 'Orders',
    name: 'Request confirmed',
    when: 'The request status changes or the team sends a message',
    build: () =>
      orderEmail({
        number: 'IC-0042',
        status: 'confirmed',
        itemCount: 3,
        totalEgp: 17900,
        agreedTotal: true,
        note: 'The roof rack is 850 EGP cheaper than listed. We will order on Sunday.',
      }),
  },
  {
    key: 'order-arrived',
    group: 'Orders',
    name: 'Accessories arrived',
    when: 'The request is marked as arrived',
    build: () => orderEmail({ number: 'IC-0042', status: 'arrived', itemCount: 3, totalEgp: 17900, agreedTotal: true }),
  },
]

export const findSample = (key: string) => EMAIL_SAMPLES.find((sample) => sample.key === key)
