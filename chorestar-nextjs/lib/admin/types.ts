export interface PowerUserStat {
  userId: string
  email: string
  familyName: string
  subscription: string
  signedUpAt: string | null
  lastSignInAt: string | null
  childCount: number
  activeChoreCount: number
  routineCount: number
  choreCompletions: number
  routineCompletions: number
  badgesEarned: number
  kidPinsSet: number
  kidLogins: number
  lastChoreActivity: string | null
  lastRoutineActivity: string | null
  lastKidLogin: string | null
  activityScore: number
  tenureDays: number | null
  daysSinceLastSignIn: number | null
  lastActivityAt: string | null
  daysSinceLastActivity: number | null
  engagementTier: 'power' | 'active' | 'light' | 'dormant'
  usesKidLogin: boolean
  usesRoutines: boolean
}

export interface PowerUserReport {
  generatedAt: string
  totals: {
    profiles: number
    authUsers: number
    withAnyActivity: number
    powerUsers: number
    activeUsers: number
    lightUsers: number
    dormantUsers: number
    usesKidLogin: number
    usesRoutines: number
    premiumOrLifetime: number
  }
  topByActivity: PowerUserStat[]
  topByTenure: PowerUserStat[]
  champions: PowerUserStat[]
  recentlyActive: PowerUserStat[]
  atRiskLoyal: PowerUserStat[]
  allUsers: PowerUserStat[]
}
