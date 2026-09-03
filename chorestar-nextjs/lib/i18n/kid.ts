'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Kid-mode translations: English, Spanish, Brazilian Portuguese, Arabic.
 *
 * Deliberately tiny, no i18n library. Only the kid-facing pages use this
 * (kid-login, the kid dashboard, and the routine player); the parent dashboard
 * stays English. Dynamic data (child names, chore titles, routine names) is
 * never translated, only UI chrome.
 *
 * Tone: for children roughly 5-12. Short, warm, playful, informal (tu / voce).
 * Arabic is Modern Standard Arabic, kept simple and warm; the kid layouts flip
 * to dir="rtl" for it (see components/kid/kid-direction.tsx).
 *
 * SSR safety: useKidT renders 'en' on the server AND on the first client
 * render, then swaps to the detected locale in an effect after hydration, so
 * the markup never mismatches.
 */

export type KidLocale = 'en' | 'es' | 'pt' | 'ar'

const en = {
  // Kid login: family code entry
  'login.noCode': 'Please enter your family code',
  'login.title': 'Kid Login',
  'login.subtitle': 'Enter your family code to get started',
  'login.linkHint': "Ask a parent for your family's kid login link. It looks like",
  'login.codeLabel': 'Family code',
  'login.codePlaceholder': 'e.g. abc12345',
  'login.continue': 'Continue',
  'login.parentsHint': "Parents: Get your family's link in Settings → Family",

  // Kid login: PIN pad
  'pin.wrongLink': 'Wrong link. Get your link from your parent.',
  'pin.tryAgain': 'Oops! Try again',
  'pin.oops': 'Oops!',
  'pin.welcome': 'Welcome!',
  'pin.enterPin': 'Enter your 4-6 digit PIN',
  'pin.clear': 'Clear',
  'pin.deleteDigit': 'Delete last digit',
  'pin.checking': 'Checking... ✨',
  'pin.differentFamily': '← Different family? Enter code',

  // Kid dashboard
  'dash.hi': 'Hi, {name}! 👋',
  'dash.ready': 'Ready for your routines?',
  'dash.logout': 'Logout',
  'dash.loadingRoutines': 'Loading routines...',
  'dash.noRoutinesTitle': 'No Routines Yet',
  'dash.noRoutinesBody': 'Ask a grownup to add routines for you!',
  'dash.steps': '{count} steps',
  'dash.start': 'Start',
  'dash.doneBadge': 'Done!',

  // Routine player
  'player.notFound': 'Oops! Routine not found',
  'player.goBack': 'Go Back',
  'player.saveFailed': "Oops! We couldn't save that. Tap Finish to try again. 💫",
  'player.exitConfirm': 'Are you sure you want to exit? Your progress will be lost.',
  'player.saving': '✨ Saving...',
  'player.finish': '🎉 Finish!',
  'player.done': '✓ Done!',
  'player.stepOf': 'Step {current} of {total}',

  // Celebration screen
  'celebrate.youDidIt': 'You Did It!',
  'celebrate.complete': '{name} Complete!',
  'celebrate.pointsEarned': 'Points Earned',
  'celebrate.stepsDone': 'Steps Done',
  'celebrate.time': 'Time',
  'celebrate.msg1': '🌟 Amazing work!',
  'celebrate.msg2': "💪 You're a superstar!",
  'celebrate.msg3': '🎯 Great job!',
  'celebrate.msg4': '✨ Fantastic!',
  'celebrate.msg5': '🏆 You rock!',
  'celebrate.msg6': '🚀 Awesome!',
  'celebrate.backHome': 'Back to Home',

  // Step timer
  'timer.timesUp': "Time's up!",
  'timer.running': 'Running...',
  'timer.paused': 'Paused',

  // Today's chores
  'chores.title': "Today's Chores",
  'chores.doneCount': '{done} / {total} done',
  'chores.waiting': '{count} waiting',
  'chores.ariaWaiting': 'waiting for a grown-up to approve',
  'chores.ariaDone': 'done',
  'chores.ariaNotDonePhoto': 'not done, takes a photo',
  'chores.ariaNotDone': 'not done',
  'chores.waitingBadge': 'Waiting for a grown-up ⏳',
  'chores.takePhoto': 'Take a photo',

  // Stats strip + badge cabinet
  'stats.dayStreak': 'day streak',
  'stats.best': 'best: {count}',
  'stats.yourBest': 'your best!',
  'stats.finishToStart': 'finish today to start',
  'stats.streakAria': '{streak} day streak, best {best}',
  'stats.thisWeek': 'this week',
  'stats.todayDone': 'today is done!',
  'stats.todayProgress': '{done} of {due} today',
  'stats.weekAria': '{money} earned this week',
  'stats.badges': 'badges',
  'stats.next': 'next: {name}',
  'stats.allEarned': 'all earned!',
  'stats.badgesAria': '{earned} of {total} badges earned. Open badge cabinet',
  'stats.cabinetTitle': "{name}'s Badges",
  'stats.earnedOfTotal': '{earned} of {total} earned',
  'stats.badgesListAria': 'Badges',

  // Badge rarity
  'rarity.common': 'common',
  'rarity.rare': 'rare',
  'rarity.epic': 'epic',
  'rarity.legendary': 'legendary',

  // Shared
  'common.close': 'Close',
  'common.saving': 'Saving...',
  'common.xOfY': '{x} of {y}',

  // Goal card + goal sheet
  'goal.savingFor': 'Saving for',
  'goal.changeAria': 'Change goal',
  'goal.ofTarget': 'of {target}',
  'goal.youDidIt': 'You did it! 🎉',
  'goal.toGo': '{money} to go',
  'goal.payItOut': 'Ask a grown-up to pay it out and pick your next goal!',
  'goal.whatSaving': 'What are you saving for?',
  'goal.pickWatch': 'You have {money}. Pick a goal and watch the bar fill up.',
  'goal.oneReached': '1 goal reached',
  'goal.manyReached': '{count} goals reached',
  'goal.pickTitle': 'Pick a goal',
  'goal.changeTitle': 'Change your goal',
  'goal.pickPicture': 'Pick a picture',
  'goal.pictureAria': 'Goal picture',
  'goal.whatIsIt': 'What is it?',
  'goal.titlePlaceholder': 'A Lego set, a scooter, a book...',
  'goal.howMuch': 'How much?',
  'goal.amountAria': 'Goal amount',
  'goal.customPlaceholder': 'or type an amount',
  'goal.customAria': 'Custom amount',
  'goal.oneAtATime': 'One goal at a time. Reach it or change it first.',
  'goal.saveFailed': 'Could not save that. Try again.',
  'goal.removeFailed': 'Could not remove that goal. Try again.',
  'goal.remove': 'Remove goal',
  'goal.startSaving': 'Start saving!',
  'goal.saveChanges': 'Save changes',

  // Reward store
  'store.needMore': 'You need {money} more for that one.',
  'store.notEnough': 'Not quite enough yet.',
  'store.asked': 'Asked! A grown-up will say yes or no to {title}.',
  'store.sendFailed': 'Could not send that. Try again.',
  'store.title': 'Reward Store',
  'store.toSpend': '{money} to spend',
  'store.askedBadge': 'Asked!',
  'store.neverMindAria': 'Never mind about {title}',
  'store.neverMind': 'Never mind',
  'store.getAria': 'Get {title} for {money}',
  'store.getIt': 'Get it!',
  'store.more': '{money} more',
  'store.spendConfirm': 'Spend {price} of your {balance}?',
  'store.grownUpDecides': 'A grown-up will say yes or no.',
  'store.notNow': 'Not now',
  'store.yesPlease': 'Yes, please!',
}

export type KidKey = keyof typeof en

const es: Record<KidKey, string> = {
  'login.noCode': 'Escribe tu código de familia',
  'login.title': 'Entrada para niños',
  'login.subtitle': 'Escribe tu código de familia para empezar',
  'login.linkHint': 'Pídele a tu mamá o papá el enlace de entrada de tu familia. Se ve así',
  'login.codeLabel': 'Código de familia',
  'login.codePlaceholder': 'p. ej. abc12345',
  'login.continue': 'Continuar',
  'login.parentsHint': 'Padres: encuentren el enlace de su familia en Configuración → Familia',

  'pin.wrongLink': 'Ese enlace no es. Pídele el enlace a tu mamá o papá.',
  'pin.tryAgain': '¡Uy! Inténtalo otra vez',
  'pin.oops': '¡Uy!',
  'pin.welcome': '¡Hola!',
  'pin.enterPin': 'Escribe tu PIN de 4 a 6 números',
  'pin.clear': 'Borrar',
  'pin.deleteDigit': 'Borrar el último número',
  'pin.checking': 'Comprobando... ✨',
  'pin.differentFamily': '← ¿Otra familia? Escribe el código',

  'dash.hi': '¡Hola, {name}! 👋',
  'dash.ready': '¿Empezamos con tus rutinas?',
  'dash.logout': 'Salir',
  'dash.loadingRoutines': 'Cargando rutinas...',
  'dash.noRoutinesTitle': 'Aún no hay rutinas',
  'dash.noRoutinesBody': '¡Pídele a un adulto que te agregue rutinas!',
  'dash.steps': '{count} pasos',
  'dash.start': 'Empezar',
  'dash.doneBadge': '¡Listo!',

  'player.notFound': '¡Uy! No encontramos esa rutina',
  'player.goBack': 'Volver',
  'player.saveFailed': '¡Uy! No se guardó. Toca Terminar para intentarlo otra vez. 💫',
  'player.exitConfirm': '¿Seguro que quieres salir? Perderás tu progreso.',
  'player.saving': '✨ Guardando...',
  'player.finish': '🎉 ¡Terminar!',
  'player.done': '✓ ¡Listo!',
  'player.stepOf': 'Paso {current} de {total}',

  'celebrate.youDidIt': '¡Lo lograste!',
  'celebrate.complete': '¡Terminaste {name}!',
  'celebrate.pointsEarned': 'Puntos ganados',
  'celebrate.stepsDone': 'Pasos hechos',
  'celebrate.time': 'Tiempo',
  'celebrate.msg1': '🌟 ¡Trabajo increíble!',
  'celebrate.msg2': '💪 ¡Eres una superestrella!',
  'celebrate.msg3': '🎯 ¡Muy bien hecho!',
  'celebrate.msg4': '✨ ¡Fantástico!',
  'celebrate.msg5': '🏆 ¡Eres genial!',
  'celebrate.msg6': '🚀 ¡Genial!',
  'celebrate.backHome': 'Volver al inicio',

  'timer.timesUp': '¡Se acabó el tiempo!',
  'timer.running': 'Contando...',
  'timer.paused': 'En pausa',

  'chores.title': 'Tareas de hoy',
  'chores.doneCount': '{done} / {total} listas',
  'chores.waiting': '{count} en espera',
  'chores.ariaWaiting': 'esperando que un adulto la apruebe',
  'chores.ariaDone': 'hecha',
  'chores.ariaNotDonePhoto': 'no hecha, necesita una foto',
  'chores.ariaNotDone': 'no hecha',
  'chores.waitingBadge': 'Esperando a un adulto ⏳',
  'chores.takePhoto': 'Toma una foto',

  'stats.dayStreak': 'días seguidos',
  'stats.best': 'récord: {count}',
  'stats.yourBest': '¡tu récord!',
  'stats.finishToStart': 'termina hoy para empezar',
  'stats.streakAria': 'racha de {streak} días, récord {best}',
  'stats.thisWeek': 'esta semana',
  'stats.todayDone': '¡hoy está listo!',
  'stats.todayProgress': '{done} de {due} hoy',
  'stats.weekAria': '{money} ganados esta semana',
  'stats.badges': 'medallas',
  'stats.next': 'siguiente: {name}',
  'stats.allEarned': '¡todas ganadas!',
  'stats.badgesAria': '{earned} de {total} medallas ganadas. Abrir la vitrina de medallas',
  'stats.cabinetTitle': 'Medallas de {name}',
  'stats.earnedOfTotal': '{earned} de {total} ganadas',
  'stats.badgesListAria': 'Medallas',

  'rarity.common': 'común',
  'rarity.rare': 'rara',
  'rarity.epic': 'épica',
  'rarity.legendary': 'legendaria',

  'common.close': 'Cerrar',
  'common.saving': 'Guardando...',
  'common.xOfY': '{x} de {y}',

  'goal.savingFor': 'Ahorrando para',
  'goal.changeAria': 'Cambiar meta',
  'goal.ofTarget': 'de {target}',
  'goal.youDidIt': '¡Lo lograste! 🎉',
  'goal.toGo': 'faltan {money}',
  'goal.payItOut': '¡Pídele a un adulto que te lo pague y elige tu próxima meta!',
  'goal.whatSaving': '¿Para qué estás ahorrando?',
  'goal.pickWatch': 'Tienes {money}. Elige una meta y mira cómo se llena la barra.',
  'goal.oneReached': '1 meta lograda',
  'goal.manyReached': '{count} metas logradas',
  'goal.pickTitle': 'Elige una meta',
  'goal.changeTitle': 'Cambia tu meta',
  'goal.pickPicture': 'Elige un dibujo',
  'goal.pictureAria': 'Dibujo de la meta',
  'goal.whatIsIt': '¿Qué es?',
  'goal.titlePlaceholder': 'Un set de Lego, una patineta, un libro...',
  'goal.howMuch': '¿Cuánto cuesta?',
  'goal.amountAria': 'Cantidad de la meta',
  'goal.customPlaceholder': 'o escribe una cantidad',
  'goal.customAria': 'Cantidad personalizada',
  'goal.oneAtATime': 'Una meta a la vez. Lógrala o cámbiala primero.',
  'goal.saveFailed': 'No se pudo guardar. Inténtalo otra vez.',
  'goal.removeFailed': 'No se pudo quitar la meta. Inténtalo otra vez.',
  'goal.remove': 'Quitar meta',
  'goal.startSaving': '¡A ahorrar!',
  'goal.saveChanges': 'Guardar cambios',

  'store.needMore': 'Te faltan {money} para ese premio.',
  'store.notEnough': 'Todavía no te alcanza.',
  'store.asked': '¡Pedido! Un adulto dirá sí o no a {title}.',
  'store.sendFailed': 'No se pudo enviar. Inténtalo otra vez.',
  'store.title': 'Tienda de premios',
  'store.toSpend': '{money} para gastar',
  'store.askedBadge': '¡Pedido!',
  'store.neverMindAria': 'Olvidar {title}',
  'store.neverMind': 'Mejor no',
  'store.getAria': 'Conseguir {title} por {money}',
  'store.getIt': '¡Lo quiero!',
  'store.more': 'faltan {money}',
  'store.spendConfirm': '¿Gastar {price} de tus {balance}?',
  'store.grownUpDecides': 'Un adulto dirá sí o no.',
  'store.notNow': 'Ahora no',
  'store.yesPlease': '¡Sí, por favor!',
}

const pt: Record<KidKey, string> = {
  'login.noCode': 'Digite o código da sua família',
  'login.title': 'Entrada das crianças',
  'login.subtitle': 'Digite o código da sua família para começar',
  'login.linkHint': 'Peça ao seu pai ou à sua mãe o link de entrada da sua família. Ele é assim',
  'login.codeLabel': 'Código da família',
  'login.codePlaceholder': 'ex.: abc12345',
  'login.continue': 'Continuar',
  'login.parentsHint': 'Pais: o link da família está em Configurações → Família',

  'pin.wrongLink': 'Esse link não é o certo. Peça o link ao seu pai ou à sua mãe.',
  'pin.tryAgain': 'Opa! Tente de novo',
  'pin.oops': 'Opa!',
  'pin.welcome': 'Oi!',
  'pin.enterPin': 'Digite seu PIN de 4 a 6 números',
  'pin.clear': 'Limpar',
  'pin.deleteDigit': 'Apagar o último número',
  'pin.checking': 'Verificando... ✨',
  'pin.differentFamily': '← Outra família? Digite o código',

  'dash.hi': 'Oi, {name}! 👋',
  'dash.ready': 'Vamos às suas rotinas?',
  'dash.logout': 'Sair',
  'dash.loadingRoutines': 'Carregando rotinas...',
  'dash.noRoutinesTitle': 'Ainda não há rotinas',
  'dash.noRoutinesBody': 'Peça a um adulto para adicionar rotinas para você!',
  'dash.steps': '{count} passos',
  'dash.start': 'Começar',
  'dash.doneBadge': 'Pronto!',

  'player.notFound': 'Opa! Não encontramos essa rotina',
  'player.goBack': 'Voltar',
  'player.saveFailed': 'Opa! Não deu para salvar. Toque em Terminar para tentar de novo. 💫',
  'player.exitConfirm': 'Quer mesmo sair? Você vai perder seu progresso.',
  'player.saving': '✨ Salvando...',
  'player.finish': '🎉 Terminar!',
  'player.done': '✓ Pronto!',
  'player.stepOf': 'Passo {current} de {total}',

  'celebrate.youDidIt': 'Você conseguiu!',
  'celebrate.complete': 'Você terminou {name}!',
  'celebrate.pointsEarned': 'Pontos ganhos',
  'celebrate.stepsDone': 'Passos feitos',
  'celebrate.time': 'Tempo',
  'celebrate.msg1': '🌟 Trabalho incrível!',
  'celebrate.msg2': '💪 Você é uma superestrela!',
  'celebrate.msg3': '🎯 Mandou bem!',
  'celebrate.msg4': '✨ Fantástico!',
  'celebrate.msg5': '🏆 Você arrasa!',
  'celebrate.msg6': '🚀 Demais!',
  'celebrate.backHome': 'Voltar ao início',

  'timer.timesUp': 'Acabou o tempo!',
  'timer.running': 'Contando...',
  'timer.paused': 'Pausado',

  'chores.title': 'Tarefas de hoje',
  'chores.doneCount': '{done} / {total} prontas',
  'chores.waiting': '{count} esperando',
  'chores.ariaWaiting': 'esperando um adulto aprovar',
  'chores.ariaDone': 'feita',
  'chores.ariaNotDonePhoto': 'não feita, precisa de uma foto',
  'chores.ariaNotDone': 'não feita',
  'chores.waitingBadge': 'Esperando um adulto ⏳',
  'chores.takePhoto': 'Tire uma foto',

  'stats.dayStreak': 'dias seguidos',
  'stats.best': 'recorde: {count}',
  'stats.yourBest': 'seu recorde!',
  'stats.finishToStart': 'termine hoje para começar',
  'stats.streakAria': 'sequência de {streak} dias, recorde {best}',
  'stats.thisWeek': 'esta semana',
  'stats.todayDone': 'hoje está pronto!',
  'stats.todayProgress': '{done} de {due} hoje',
  'stats.weekAria': '{money} ganhos esta semana',
  'stats.badges': 'medalhas',
  'stats.next': 'próxima: {name}',
  'stats.allEarned': 'todas ganhas!',
  'stats.badgesAria': '{earned} de {total} medalhas ganhas. Abrir o armário de medalhas',
  'stats.cabinetTitle': 'Medalhas de {name}',
  'stats.earnedOfTotal': '{earned} de {total} ganhas',
  'stats.badgesListAria': 'Medalhas',

  'rarity.common': 'comum',
  'rarity.rare': 'rara',
  'rarity.epic': 'épica',
  'rarity.legendary': 'lendária',

  'common.close': 'Fechar',
  'common.saving': 'Salvando...',
  'common.xOfY': '{x} de {y}',

  'goal.savingFor': 'Juntando para',
  'goal.changeAria': 'Mudar meta',
  'goal.ofTarget': 'de {target}',
  'goal.youDidIt': 'Você conseguiu! 🎉',
  'goal.toGo': 'faltam {money}',
  'goal.payItOut': 'Peça a um adulto para pagar e escolha sua próxima meta!',
  'goal.whatSaving': 'Para que você está juntando?',
  'goal.pickWatch': 'Você tem {money}. Escolha uma meta e veja a barra encher.',
  'goal.oneReached': '1 meta alcançada',
  'goal.manyReached': '{count} metas alcançadas',
  'goal.pickTitle': 'Escolha uma meta',
  'goal.changeTitle': 'Mude sua meta',
  'goal.pickPicture': 'Escolha uma figura',
  'goal.pictureAria': 'Figura da meta',
  'goal.whatIsIt': 'O que é?',
  'goal.titlePlaceholder': 'Um Lego, um patinete, um livro...',
  'goal.howMuch': 'Quanto custa?',
  'goal.amountAria': 'Valor da meta',
  'goal.customPlaceholder': 'ou digite um valor',
  'goal.customAria': 'Valor personalizado',
  'goal.oneAtATime': 'Uma meta de cada vez. Alcance ou troque a sua primeiro.',
  'goal.saveFailed': 'Não deu para salvar. Tente de novo.',
  'goal.removeFailed': 'Não deu para remover a meta. Tente de novo.',
  'goal.remove': 'Remover meta',
  'goal.startSaving': 'Começar a juntar!',
  'goal.saveChanges': 'Salvar mudanças',

  'store.needMore': 'Faltam {money} para esse prêmio.',
  'store.notEnough': 'Ainda não dá.',
  'store.asked': 'Pedido! Um adulto vai dizer sim ou não para {title}.',
  'store.sendFailed': 'Não deu para enviar. Tente de novo.',
  'store.title': 'Lojinha de prêmios',
  'store.toSpend': '{money} para gastar',
  'store.askedBadge': 'Pedido!',
  'store.neverMindAria': 'Deixar {title} para lá',
  'store.neverMind': 'Deixa pra lá',
  'store.getAria': 'Pegar {title} por {money}',
  'store.getIt': 'Quero!',
  'store.more': 'faltam {money}',
  'store.spendConfirm': 'Gastar {price} dos seus {balance}?',
  'store.grownUpDecides': 'Um adulto vai dizer sim ou não.',
  'store.notNow': 'Agora não',
  'store.yesPlease': 'Sim, por favor!',
}

const ar: Record<KidKey, string> = {
  'login.noCode': 'من فضلك اكتب رمز عائلتك',
  'login.title': 'دخول الأطفال',
  'login.subtitle': 'اكتب رمز عائلتك لنبدأ',
  'login.linkHint': 'اطلب من ماما أو بابا رابط دخول عائلتك. شكله هكذا',
  'login.codeLabel': 'رمز العائلة',
  'login.codePlaceholder': 'مثال: abc12345',
  'login.continue': 'متابعة',
  'login.parentsHint': 'للوالدين: تجدون رابط عائلتكم في الإعدادات ← العائلة',

  'pin.wrongLink': 'هذا الرابط غير صحيح. اطلب الرابط من ماما أو بابا.',
  'pin.tryAgain': 'أوبس! حاول مرة أخرى',
  'pin.oops': 'أوبس!',
  'pin.welcome': 'أهلاً بك!',
  'pin.enterPin': 'اكتب رقمك السري من 4 إلى 6 أرقام',
  'pin.clear': 'مسح',
  'pin.deleteDigit': 'مسح آخر رقم',
  'pin.checking': 'جارٍ التحقق... ✨',
  'pin.differentFamily': '→ عائلة أخرى؟ اكتب الرمز',

  'dash.hi': 'أهلاً يا {name}! 👋',
  'dash.ready': 'هل أنت جاهز لروتينك؟',
  'dash.logout': 'خروج',
  'dash.loadingRoutines': 'جارٍ تحميل الروتينات...',
  'dash.noRoutinesTitle': 'لا توجد روتينات بعد',
  'dash.noRoutinesBody': 'اطلب من شخص كبير أن يضيف لك روتينات!',
  'dash.steps': '{count} خطوات',
  'dash.start': 'ابدأ',
  'dash.doneBadge': 'تم!',

  'player.notFound': 'أوبس! لم نجد هذا الروتين',
  'player.goBack': 'رجوع',
  'player.saveFailed': 'أوبس! لم نستطع الحفظ. اضغط "إنهاء" للمحاولة مرة أخرى. 💫',
  'player.exitConfirm': 'هل تريد الخروج حقًا؟ ستفقد تقدمك.',
  'player.saving': '✨ جارٍ الحفظ...',
  'player.finish': '🎉 إنهاء!',
  'player.done': '✓ تم!',
  'player.stepOf': 'الخطوة {current} من {total}',

  'celebrate.youDidIt': 'لقد نجحت!',
  'celebrate.complete': 'أكملت {name}!',
  'celebrate.pointsEarned': 'النقاط المكتسبة',
  'celebrate.stepsDone': 'الخطوات المنجزة',
  'celebrate.time': 'الوقت',
  'celebrate.msg1': '🌟 عمل رائع!',
  'celebrate.msg2': '💪 أنت نجم خارق!',
  'celebrate.msg3': '🎯 أحسنت!',
  'celebrate.msg4': '✨ مذهل!',
  'celebrate.msg5': '🏆 أنت بطل!',
  'celebrate.msg6': '🚀 رائع!',
  'celebrate.backHome': 'العودة إلى البداية',

  'timer.timesUp': 'انتهى الوقت!',
  'timer.running': 'جارٍ العد...',
  'timer.paused': 'متوقف مؤقتًا',

  'chores.title': 'مهام اليوم',
  'chores.doneCount': '{done} / {total} منجزة',
  'chores.waiting': '{count} في الانتظار',
  'chores.ariaWaiting': 'في انتظار موافقة شخص كبير',
  'chores.ariaDone': 'منجزة',
  'chores.ariaNotDonePhoto': 'غير منجزة، تحتاج إلى صورة',
  'chores.ariaNotDone': 'غير منجزة',
  'chores.waitingBadge': 'في انتظار شخص كبير ⏳',
  'chores.takePhoto': 'التقط صورة',

  'stats.dayStreak': 'أيام متتالية',
  'stats.best': 'الرقم القياسي: {count}',
  'stats.yourBest': 'رقمك القياسي!',
  'stats.finishToStart': 'أكمل مهام اليوم لتبدأ',
  'stats.streakAria': 'سلسلة {streak} أيام، الرقم القياسي {best}',
  'stats.thisWeek': 'هذا الأسبوع',
  'stats.todayDone': 'انتهى يومك!',
  'stats.todayProgress': '{done} من {due} اليوم',
  'stats.weekAria': 'ربحت {money} هذا الأسبوع',
  'stats.badges': 'أوسمة',
  'stats.next': 'التالي: {name}',
  'stats.allEarned': 'حصلت عليها كلها!',
  'stats.badgesAria': 'حصلت على {earned} من {total} أوسمة. افتح خزانة الأوسمة',
  'stats.cabinetTitle': 'أوسمة {name}',
  'stats.earnedOfTotal': 'حصلت على {earned} من {total}',
  'stats.badgesListAria': 'الأوسمة',

  'rarity.common': 'عادي',
  'rarity.rare': 'نادر',
  'rarity.epic': 'ملحمي',
  'rarity.legendary': 'أسطوري',

  'common.close': 'إغلاق',
  'common.saving': 'جارٍ الحفظ...',
  'common.xOfY': '{x} من {y}',

  'goal.savingFor': 'أوفر من أجل',
  'goal.changeAria': 'تغيير الهدف',
  'goal.ofTarget': 'من {target}',
  'goal.youDidIt': 'لقد نجحت! 🎉',
  'goal.toGo': 'باقي {money}',
  'goal.payItOut': 'اطلب من شخص كبير أن يعطيك المبلغ واختر هدفك التالي!',
  'goal.whatSaving': 'من أجل ماذا توفر نقودك؟',
  'goal.pickWatch': 'لديك {money}. اختر هدفًا وشاهد الشريط يمتلئ.',
  'goal.oneReached': 'حققت هدفًا واحدًا',
  'goal.manyReached': 'حققت {count} أهداف',
  'goal.pickTitle': 'اختر هدفًا',
  'goal.changeTitle': 'غيّر هدفك',
  'goal.pickPicture': 'اختر صورة',
  'goal.pictureAria': 'صورة الهدف',
  'goal.whatIsIt': 'ما هو؟',
  'goal.titlePlaceholder': 'مجموعة ليغو، سكوتر، كتاب...',
  'goal.howMuch': 'كم ثمنه؟',
  'goal.amountAria': 'مبلغ الهدف',
  'goal.customPlaceholder': 'أو اكتب مبلغًا',
  'goal.customAria': 'مبلغ مخصص',
  'goal.oneAtATime': 'هدف واحد في كل مرة. حققه أو غيّره أولًا.',
  'goal.saveFailed': 'لم نستطع الحفظ. حاول مرة أخرى.',
  'goal.removeFailed': 'لم نستطع إزالة الهدف. حاول مرة أخرى.',
  'goal.remove': 'إزالة الهدف',
  'goal.startSaving': 'ابدأ التوفير!',
  'goal.saveChanges': 'حفظ التغييرات',

  'store.needMore': 'تحتاج إلى {money} إضافية لهذه الجائزة.',
  'store.notEnough': 'المبلغ لا يكفي بعد.',
  'store.asked': 'تم الطلب! سيقول شخص كبير نعم أو لا عن {title}.',
  'store.sendFailed': 'لم نستطع الإرسال. حاول مرة أخرى.',
  'store.title': 'متجر الجوائز',
  'store.toSpend': '{money} للإنفاق',
  'store.askedBadge': 'تم الطلب!',
  'store.neverMindAria': 'إلغاء طلب {title}',
  'store.neverMind': 'لا عليك',
  'store.getAria': 'احصل على {title} مقابل {money}',
  'store.getIt': 'أريدها!',
  'store.more': 'باقي {money}',
  'store.spendConfirm': 'هل تنفق {price} من رصيدك {balance}؟',
  'store.grownUpDecides': 'شخص كبير سيقول نعم أو لا.',
  'store.notNow': 'ليس الآن',
  'store.yesPlease': 'نعم، من فضلك!',
}

const DICTIONARIES: Record<KidLocale, Record<KidKey, string>> = { en, es, pt, ar }

/**
 * Browser-language detection: es* -> 'es', pt* -> 'pt', ar* -> 'ar',
 * everything else 'en'. Safe to call on the server, where it always
 * returns 'en'.
 */
export function detectKidLocale(): KidLocale {
  if (typeof navigator === 'undefined' || !navigator.language) return 'en'
  const lang = navigator.language.toLowerCase()
  if (lang.startsWith('es')) return 'es'
  if (lang.startsWith('pt')) return 'pt'
  if (lang.startsWith('ar')) return 'ar'
  return 'en'
}

export type KidTranslate = (key: KidKey, vars?: Record<string, string | number>) => string

/**
 * t(key, vars?) with {placeholder} substitution.
 *
 * The locale starts as 'en' so the server HTML and the first client render
 * match; the detected locale is applied in an effect after hydration, which
 * is the standard pattern for avoiding hydration mismatches.
 */
export function useKidT(): KidTranslate {
  const [locale, setLocale] = useState<KidLocale>('en')

  useEffect(() => {
    setLocale(detectKidLocale())
  }, [])

  return useCallback<KidTranslate>(
    (key, vars) => {
      let text: string = DICTIONARIES[locale][key]
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.split(`{${name}}`).join(String(value))
        }
      }
      return text
    },
    [locale]
  )
}
