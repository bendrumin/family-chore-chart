/**
 * Which feature to point a family at next, and when a quiet family is due a
 * nudge. Pure, so lib/engagement/discovery.test.ts covers it without a database.
 *
 * Why this exists: in October 2026 three Apple subscribers turned off
 * auto-renew, and the two who were really leaving had stopped opening the app
 * 25 and 35 days earlier. Five premium features shipped that month had ten
 * combined uses. People were not leaving for lack of features; they had
 * forgotten the app, and never met what they were paying for. So the same list
 * drives two things: a push for families who have gone quiet, and a card for
 * families who are active but have not found something yet.
 *
 * Order is deliberate. A kid's own PIN and a routine come first because in
 * this product's own data they predict whether a family is still active a
 * month later (about 3.6x and 2.6x). Premium features follow, only for
 * families who have them: the newer ones are Premium-only and not
 * grandfathered (docs/PREMIUM.md), so pointing a free family at money jars
 * would send them to a paywall.
 */

export type FeatureId = 'kid_login' | 'routines' | 'star_pets' | 'money_jars' | 'challenges' | 'calendar_feed'

/** Where a feature can be pointed at. Star Pets are not in the iOS app yet, so
 *  a push about them would land most families on a screen without them. */
export type Surface = 'push' | 'web'

export interface FamilyUsage {
  hasPin: boolean
  hasRoutine: boolean
  hasPet: boolean
  hasMoney: boolean
  hasChallenge: boolean
  hasCalendar: boolean
  /** Challenges are siblings working together; one kid has no one to team up with. */
  kidCount: number
}

export interface Feature {
  id: FeatureId
  premiumOnly: boolean
  surfaces: Surface[]
  tried: (u: FamilyUsage) => boolean
  /** False when the feature makes no sense for this family yet. */
  applies?: (u: FamilyUsage) => boolean
  /** Push notification copy. `kid` is the family's first child's name. */
  push: (kid: string) => { title: string; body: string }
  /** In-app card copy and the button label. */
  card: (kid: string) => { title: string; body: string; cta: string }
}

export const FEATURES: Feature[] = [
  {
    id: 'kid_login',
    premiumOnly: false,
    surfaces: ['push', 'web'],
    tried: (u) => u.hasPin,
    push: (kid) => ({
      title: `Let ${kid} tick off their own chores`,
      body: `Set a 4-digit PIN and ${kid} can sign in on any device. No email needed.`,
    }),
    card: (kid) => ({
      title: `Give ${kid} their own login`,
      body: `With a 4-digit PIN, ${kid} signs in on any device and checks off chores without you.`,
      cta: 'Set a PIN',
    }),
  },
  {
    id: 'routines',
    premiumOnly: false,
    surfaces: ['push', 'web'],
    tried: (u) => u.hasRoutine,
    push: (kid) => ({
      title: 'Mornings, sorted',
      body: `Build a morning routine ${kid} can step through alone, one big Done button at a time.`,
    }),
    card: (kid) => ({
      title: 'Try a morning routine',
      body: `Get dressed, brush teeth, pack the bag: ${kid} steps through it one task at a time.`,
      cta: 'Build a routine',
    }),
  },
  {
    id: 'star_pets',
    premiumOnly: false,
    surfaces: ['web'],
    tried: (u) => u.hasPet,
    push: (kid) => ({ title: `${kid} can adopt a Star Pet`, body: 'It grows as chores get done.' }),
    card: (kid) => ({
      title: `${kid} can adopt a Star Pet`,
      body: 'A pet that grows every time a chore gets done. Every family gets a pup.',
      cta: 'Turn on Star Pets',
    }),
  },
  {
    id: 'money_jars',
    premiumOnly: true,
    surfaces: ['push', 'web'],
    tried: (u) => u.hasMoney,
    push: (kid) => ({
      title: `${kid}'s allowance can run itself`,
      body: 'Spend, Save and Give jars and a weekly allowance are part of your Premium.',
    }),
    card: (kid) => ({
      title: 'Spend, Save and Give jars',
      body: `Split ${kid}'s earnings into jars, pay a weekly allowance automatically, and add interest on savings.`,
      cta: 'Set up jars',
    }),
  },
  {
    id: 'challenges',
    premiumOnly: true,
    surfaces: ['push', 'web'],
    tried: (u) => u.hasChallenge,
    applies: (u) => u.kidCount > 1,
    push: () => ({
      title: 'Team up the kids',
      body: 'Family challenges let siblings work toward one shared reward. It is part of your Premium.',
    }),
    card: () => ({
      title: 'Start a family challenge',
      body: 'Siblings work together toward one shared reward, like pizza night after 30 chores.',
      cta: 'Start a challenge',
    }),
  },
  {
    id: 'calendar_feed',
    premiumOnly: true,
    surfaces: ['push', 'web'],
    tried: (u) => u.hasCalendar,
    push: () => ({
      title: 'Chores on your calendar',
      body: 'Add the family chore chart to Apple, Google or Outlook calendar. It is part of your Premium.',
    }),
    card: () => ({
      title: 'Put chores on your calendar',
      body: 'Subscribe once in Apple, Google or Outlook calendar and the week stays in sync.',
      cta: 'Get the calendar link',
    }),
  },
]

/** Languages the native apps' parent UI ships in. Push copy stays English:
 *  nothing records a family's language yet. */
export type CopyLang = 'en' | 'es' | 'pt' | 'ar'

type Card = ReturnType<Feature['card']>

const CARD_TRANSLATIONS: Record<Exclude<CopyLang, 'en'>, Record<FeatureId, (kid: string) => Card>> = {
  es: {
    kid_login: (kid) => ({ title: `Dale a ${kid} su propio acceso`, body: `Con un PIN de 4 dígitos, ${kid} entra desde cualquier dispositivo y marca sus tareas sin ti.`, cta: 'Crear un PIN' }),
    routines: (kid) => ({ title: 'Prueba una rutina de mañana', body: `Vestirse, lavarse los dientes, preparar la mochila: ${kid} lo hace paso a paso.`, cta: 'Crear una rutina' }),
    star_pets: (kid) => ({ title: `${kid} puede adoptar una Mascota Estrella`, body: 'Una mascota que crece con cada tarea hecha. Todas las familias reciben un perrito.', cta: 'Ver Mascotas Estrella' }),
    money_jars: (kid) => ({ title: 'Frascos para Gastar, Ahorrar y Dar', body: `Reparte lo que gana ${kid} en frascos, paga una mesada semanal automática y agrega interés al ahorro.`, cta: 'Configurar frascos' }),
    challenges: () => ({ title: 'Empieza un reto en familia', body: 'Los hermanos trabajan juntos por un premio compartido, como una noche de pizza tras 30 tareas.', cta: 'Crear un reto' }),
    calendar_feed: () => ({ title: 'Pon las tareas en tu calendario', body: 'Suscríbete una vez en el calendario de Apple, Google u Outlook y la semana se mantiene al día.', cta: 'Obtener el enlace' }),
  },
  pt: {
    kid_login: (kid) => ({ title: `Dê a ${kid} um acesso próprio`, body: `Com um PIN de 4 dígitos, ${kid} entra em qualquer aparelho e marca as tarefas sem você.`, cta: 'Criar um PIN' }),
    routines: (kid) => ({ title: 'Experimente uma rotina da manhã', body: `Vestir-se, escovar os dentes, arrumar a mochila: ${kid} faz tudo passo a passo.`, cta: 'Criar uma rotina' }),
    star_pets: (kid) => ({ title: `${kid} pode adotar um Pet Estrela`, body: 'Um pet que cresce a cada tarefa feita. Toda família ganha um cachorrinho.', cta: 'Ver Pets Estrela' }),
    money_jars: (kid) => ({ title: 'Potes para Gastar, Poupar e Doar', body: `Divida o que ${kid} ganha em potes, pague uma mesada semanal automática e adicione juros à poupança.`, cta: 'Configurar potes' }),
    challenges: () => ({ title: 'Comece um desafio em família', body: 'Os irmãos trabalham juntos por um prêmio compartilhado, como uma noite de pizza depois de 30 tarefas.', cta: 'Criar um desafio' }),
    calendar_feed: () => ({ title: 'Coloque as tarefas na sua agenda', body: 'Assine uma vez no calendário da Apple, Google ou Outlook e a semana fica sempre atualizada.', cta: 'Pegar o link' }),
  },
  ar: {
    kid_login: (kid) => ({ title: `امنح ${kid} دخولًا خاصًا`, body: `برمز PIN من 4 أرقام، يدخل ${kid} من أي جهاز ويشطب مهامه بنفسه.`, cta: 'أنشئ رمز PIN' }),
    routines: (kid) => ({ title: 'جرّب روتين الصباح', body: `ارتداء الملابس، تنظيف الأسنان، تجهيز الحقيبة: ينجزها ${kid} خطوة بخطوة.`, cta: 'أنشئ روتينًا' }),
    star_pets: (kid) => ({ title: `يمكن لـ${kid} تبنّي حيوان نجم`, body: 'حيوان أليف يكبر مع كل مهمة تُنجز. تحصل كل عائلة على جرو.', cta: 'اعرض الحيوانات النجوم' }),
    money_jars: (kid) => ({ title: 'حصالات الصرف والادخار والعطاء', body: `قسّم أرباح ${kid} على الحصالات، وادفع مصروفًا أسبوعيًا تلقائيًا، وأضف فائدة على الادخار.`, cta: 'إعداد الحصالات' }),
    challenges: () => ({ title: 'ابدأ تحديًا عائليًا', body: 'يعمل الإخوة معًا لجائزة مشتركة، مثل ليلة بيتزا بعد 30 مهمة.', cta: 'أنشئ تحديًا' }),
    calendar_feed: () => ({ title: 'ضع المهام في تقويمك', body: 'اشترك مرة واحدة في تقويم Apple أو Google أو Outlook ويبقى الأسبوع محدّثًا.', cta: 'احصل على الرابط' }),
  },
}

/** `es`, `pt-BR`, `ar_SA`... to a CopyLang; anything else is English. */
export function copyLang(raw: string | null | undefined): CopyLang {
  const base = (raw ?? '').toLowerCase().slice(0, 2)
  return base === 'es' || base === 'pt' || base === 'ar' ? base : 'en'
}

/** A feature's card copy in the app's language. */
export function cardCopy(f: Feature, kid: string, lang: CopyLang = 'en'): Card {
  return lang === 'en' ? f.card(kid) : CARD_TRANSLATIONS[lang][f.id](kid)
}

/** The next feature this family has not tried, on this surface, that their plan includes. */
export function nextFeature(
  usage: FamilyUsage,
  premium: boolean,
  surface: Surface,
  skip: ReadonlySet<FeatureId> = new Set()
): Feature | null {
  for (const f of FEATURES) {
    if (!f.surfaces.includes(surface)) continue
    if (f.premiumOnly && !premium) continue
    if (skip.has(f.id)) continue
    if (f.tried(usage)) continue
    if (f.applies && !f.applies(usage)) continue
    return f
  }
  return null
}

/** Every feature this family has not tried, on this surface, that their plan includes. */
export function untriedFeatures(usage: FamilyUsage, premium: boolean, surface: Surface): Feature[] {
  return FEATURES.filter((f) => f.surfaces.includes(surface) && (!f.premiumOnly || premium) && !f.tried(usage) && (!f.applies || f.applies(usage)))
}

/** Copy for a quiet family who has already tried everything worth pointing at. */
export function fallbackPush(kid: string): { title: string; body: string } {
  return { title: 'Ready for this week?', body: `${kid}'s chore chart is waiting. Pick up where you left off.` }
}

export const LAPSE_MIN_DAYS = 7
/** Past this the family has most likely moved on, and a push out of nowhere
 *  reads as spam rather than a reminder. Also bounds the first run, which
 *  would otherwise reach every family that has ever gone quiet. */
export const LAPSE_MAX_DAYS = 30

const DAY_MS = 86_400_000

/**
 * Whether a quiet family is due one nudge.
 *
 * One per lapse: once nudged, nothing more until they come back and go quiet
 * again (lastNudged earlier than lastActivity). Never during vacation mode,
 * which promises the family "alerts quiet".
 */
export function lapseDue(args: {
  lastActivity: Date | null
  lastNudged: Date | null
  now: Date
  onVacation: boolean
}): { due: boolean; daysQuiet: number | null } {
  const { lastActivity, lastNudged, now, onVacation } = args
  if (!lastActivity) return { due: false, daysQuiet: null }
  const daysQuiet = Math.floor((now.getTime() - lastActivity.getTime()) / DAY_MS)
  if (onVacation) return { due: false, daysQuiet }
  if (daysQuiet < LAPSE_MIN_DAYS || daysQuiet > LAPSE_MAX_DAYS) return { due: false, daysQuiet }
  if (lastNudged && lastNudged.getTime() >= lastActivity.getTime()) return { due: false, daysQuiet }
  return { due: true, daysQuiet }
}

/** True when `day` (YYYY-MM-DD) falls inside an inclusive date range. */
export function withinRange(day: string, start: string | null | undefined, end: string | null | undefined): boolean {
  if (!start) return false
  if (day < start) return false
  return !end || day <= end
}
