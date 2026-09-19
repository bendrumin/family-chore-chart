/** FAQ content shared by the in-app help modal and the public /faq page. */

export interface FAQItem {
  category: string
  question: string
  answer: string
}

export const FAQ_DATA: FAQItem[] = [
  {
    category: 'Getting Started',
    question: 'How do I add my first child?',
    answer: 'Click the "Add Child" button on the main dashboard. You can customize their name, age, and avatar. Each child can have their own unique avatar and color.'
  },
  {
    category: 'Getting Started',
    question: 'How do I create chores?',
    answer: 'Select a child from the sidebar, then click "Add Chore" in their chore list. You can set the chore name, category, and reward amount.'
  },
  {
    category: 'Chores',
    question: 'How do chore rewards work?',
    answer: 'Choose between two reward modes in Settings → Family. "Flat Daily Rate" pays a set amount for any day with completions. "Per Chore" adds up each individual chore\'s reward as kids complete them, great for making bigger chores worth more. Either way, you can set a Full Week Bonus Reward (like "pizza night") that shows as a celebration when kids nail every chore every day of the week.'
  },
  {
    category: 'Chores',
    question: 'Can I edit multiple chores at once?',
    answer: 'Yes. Go to Settings > Chores and click "Open Bulk Editor". You can select multiple chores and change their category, reward, or delete them all at once.'
  },
  {
    category: 'Chores',
    question: 'Can I pause chores while we are on vacation?',
    answer: 'Yes. Go to Settings > Family and turn on Vacation mode with your travel dates. Nothing is due while you are away, so streaks and perfect weeks stay safe, and the grid shows no misses. Kids see a friendly note that their streak is waiting for them, and the reward store stays open. It ends on its own, or you can end it early from the dashboard.'
  },
  {
    category: 'Chores',
    question: 'What are chore categories?',
    answer: 'Categories help organize chores into groups like Household Chores, Reading, Physical Activity, Creative Time, and more. This makes it easier to track different types of activities.'
  },
  {
    category: 'Settings',
    question: 'How do I change the theme?',
    answer: 'Go to Settings > Appearance. You can choose from 13 seasonal themes or enable auto-seasonal mode. Premium themes (Ocean, Sunset, Forest, etc.) require a Premium subscription.'
  },
  {
    category: 'Settings',
    question: 'How does kid login work?',
    answer: 'Get your unique kid login link in Settings > Family. Share that link with kids. They enter their 4–6 digit PIN (set per child in Edit Children) and see only your family\'s routines.'
  },
  {
    category: 'Account',
    question: 'What\'s included in Premium?',
    answer: 'Premium includes unlimited children and chores (the free plan has 3 kids and 20 chores), unlimited reward store items and goals, family sharing with a co-parent, PDF and CSV export reports, advanced analytics, and the premium themes. Printable chore charts stay free. Upgrade in Settings > Billing.'
  },
  {
    category: 'Settings',
    question: 'Can I change the currency?',
    answer: 'Yes. Go to Settings > Family and select your preferred currency from the dropdown. ChoreStar supports 12 major currencies worldwide.'
  },
  {
    category: 'Settings',
    question: 'How do I edit all my children at once?',
    answer: 'Go to Settings > Family and click "Open Editor" in the Edit All Children section. You can navigate through each child and update their information one by one.'
  },
  {
    category: 'Tracking',
    question: 'What do the weekly stats show?',
    answer: 'Weekly stats display total completions, earnings, completion rate percentage, and current streak. Kids can also earn achievement badges for milestones.'
  },
  {
    category: 'Tracking',
    question: 'How are streaks calculated?',
    answer: 'Streaks count consecutive days with at least one chore completion. Completing chores every day keeps the streak going.'
  },
  {
    category: 'Tracking',
    question: 'What achievement badges can I earn?',
    answer: '🔥 5+ Day Streak, ⭐ Perfect Week (100% completion), 🏆 Super Productive (10+ completions), and more. Badges appear automatically when you reach milestones.'
  },
  {
    category: 'Account',
    question: 'Is my data safe?',
    answer: 'Yes. All your data is securely stored and encrypted. Only you can access your family\'s information.'
  },
  {
    category: 'Account',
    question: 'Can I delete a child?',
    answer: 'Yes, open the child\'s edit modal (click their card or go to Settings > Family > Open Editor) and click the trash icon in the header or the Delete button at the bottom. This will also delete all their chores and completion history.'
  },
  {
    category: 'Family Sharing',
    question: 'What is Family Sharing?',
    answer: 'Family Sharing lets you invite a co-parent or guardian to access your ChoreStar family. Shared members get full access to manage children, chores, and routines, perfect for two-parent households or blended families.'
  },
  {
    category: 'Family Sharing',
    question: 'How do I invite a co-parent or guardian?',
    answer: 'Go to Settings > Family and click "Manage Sharing". Enter their email address and click "Send Invite". They\'ll receive an email with a link to accept. They\'ll need a ChoreStar account (free to create) to join.'
  },
  {
    category: 'Family Sharing',
    question: 'What can a shared family member do?',
    answer: 'Shared members have full access: they can view and manage all children, chores, and routines just like the account owner. They log in with their own account and see your family\'s data.'
  },
  {
    category: 'Family Sharing',
    question: 'How do I remove a family member?',
    answer: 'Go to Settings > Family > Manage Sharing. You\'ll see a list of active members. Click the remove button next to anyone you want to revoke access for. They\'ll lose access immediately.'
  },
  {
    category: 'Family Sharing',
    question: 'Can I resend an invite if they didn\'t get the email?',
    answer: 'Yes. Open Manage Sharing and find the pending invite. Click the resend icon next to it. This refreshes the invite link and sends a fresh email.'
  },
]
