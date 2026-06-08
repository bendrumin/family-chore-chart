/** Founder/admin access for /dashboard/admin */
export function getAdminEmails(): string[] {
  // bsiegel13@gmail.com always has access; FOUNDER_ADMIN_EMAILS adds more (comma-separated)
  const extra = (process.env.FOUNDER_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  return [...new Set(['bsiegel13@gmail.com', ...extra])]
}

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false
  return getAdminEmails().includes(email.toLowerCase())
}
