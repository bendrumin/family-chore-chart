// i18next Setup for ChoreStar
// Simplified internationalization setup for vanilla JavaScript

// Translation resources
const translations = {
  en: {
    // Navigation & General
    "app_name": "ChoreStar",
    "dashboard": "Dashboard",
    "chores": "Chores",
    "settings": "Settings",
    "family": "Family",
    "reports": "Reports",
    "logout": "Logout",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "add": "Add",
    "close": "Close",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "warning": "Warning",
    
    // Family Management
    "family_management": "Family Management",
    "add_child": "Add Child",
    "edit_child": "Edit Child",
    "child_name": "Child Name",
    "child_age": "Age",
    "child_avatar": "Avatar",
    "child_color": "Color",
    "child_icon": "Icon",
    "remove_child": "Remove Child",
    "confirm_remove_child": "Are you sure you want to remove {{name}}?",
    
    // Chore Management
    "chore_management": "Chore Management",
    "add_chore": "Add Chore",
    "edit_chore": "Edit Chore",
    "chore_name": "Chore Name",
    "chore_description": "Description",
    "chore_category": "Category",
    "chore_reward": "Reward",
    "chore_frequency": "Frequency",
    "chore_assigned_to": "Assigned To",
    "remove_chore": "Remove Chore",
    "confirm_remove_chore": "Are you sure you want to remove this chore?",
    
    // Chore Categories
    "category_cleaning": "Cleaning",
    "category_kitchen": "Kitchen",
    "category_outdoor": "Outdoor",
    "category_laundry": "Laundry",
    "category_pet_care": "Pet Care",
    "category_other": "Other",
    
    // Chore Frequency
    "frequency_daily": "Daily",
    "frequency_weekly": "Weekly",
    "frequency_as_needed": "As Needed",
    
    // Chore Status
    "chore_completed": "Completed",
    "chore_pending": "Pending",
    "chore_overdue": "Overdue",
    "complete_chore": "Complete Chore",
    "mark_complete": "Mark Complete",
    "mark_incomplete": "Mark Incomplete",
    
    // Rewards & Earnings
    "daily_reward": "Daily Reward",
    "weekly_bonus": "Weekly Bonus",
    "total_earnings": "Total Earnings",
    "this_week": "This Week",
    "earnings": "Earnings",
    "rewards": "Rewards",
    "bonus": "Bonus",
    
    // Time & Dates
    "today": "Today",
    "yesterday": "Yesterday",
    "this_week": "This Week",
    "last_week": "Last Week",
    "monday": "Monday",
    "tuesday": "Tuesday",
    "wednesday": "Wednesday",
    "thursday": "Thursday",
    "friday": "Friday",
    "saturday": "Saturday",
    "sunday": "Sunday",
    
    // Settings
    "family_settings": "Family Settings",
    "reward_settings": "Reward Settings",
    "currency": "Currency",
    "date_format": "Date Format",
    "language": "Language",
    "timezone": "Timezone",
    "notifications": "Notifications",
    "sound_enabled": "Sound Enabled",
    "email_notifications": "Email Notifications",
    
    // Messages & Feedback
    "chore_added_success": "Chore added successfully!",
    "chore_updated_success": "Chore updated successfully!",
    "chore_deleted_success": "Chore deleted successfully!",
    "child_added_success": "Child added successfully!",
    "child_updated_success": "Child updated successfully!",
    "child_deleted_success": "Child deleted successfully!",
    "settings_updated_success": "Settings updated successfully!",
    "language_changed_success": "Language changed successfully!",
    "please_fill_all_fields": "Please fill in all fields",
    "something_went_wrong": "Something went wrong. Please try again.",
    
    // Pluralization
    "chore_count": "{{count}} chore",
    "chore_count_plural": "{{count}} chores",
    "day_count": "{{count}} day",
    "day_count_plural": "{{count}} days",
    "week_count": "{{count}} week",
    "week_count_plural": "{{count}} weeks",
    
    // Special Messages
    "welcome_message": "Welcome to ChoreStar!",
    "no_chores_today": "No chores for today!",
    "all_chores_complete": "All chores completed! Great job!",
    "keep_up_good_work": "Keep up the good work!",
    "family_teamwork": "Family teamwork makes the dream work!"
  },
  
  es: {
    // Navigation & General
    "app_name": "ChoreStar",
    "dashboard": "Panel",
    "chores": "Tareas",
    "settings": "Configuración",
    "family": "Familia",
    "reports": "Informes",
    "logout": "Cerrar Sesión",
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "edit": "Editar",
    "add": "Agregar",
    "close": "Cerrar",
    "loading": "Cargando...",
    "error": "Error",
    "success": "Éxito",
    "warning": "Advertencia",
    
    // Family Management
    "family_management": "Gestión Familiar",
    "add_child": "Agregar Niño",
    "edit_child": "Editar Niño",
    "child_name": "Nombre del Niño",
    "child_age": "Edad",
    "child_avatar": "Avatar",
    "child_color": "Color",
    "child_icon": "Icono",
    "remove_child": "Eliminar Niño",
    "confirm_remove_child": "¿Estás seguro de que quieres eliminar a {{name}}?",
    
    // Chore Management
    "chore_management": "Gestión de Tareas",
    "add_chore": "Agregar Tarea",
    "edit_chore": "Editar Tarea",
    "chore_name": "Nombre de la Tarea",
    "chore_description": "Descripción",
    "chore_category": "Categoría",
    "chore_reward": "Recompensa",
    "chore_frequency": "Frecuencia",
    "chore_assigned_to": "Asignado A",
    "remove_chore": "Eliminar Tarea",
    "confirm_remove_chore": "¿Estás seguro de que quieres eliminar esta tarea?",
    
    // Chore Categories
    "category_cleaning": "Limpieza",
    "category_kitchen": "Cocina",
    "category_outdoor": "Exterior",
    "category_laundry": "Lavandería",
    "category_pet_care": "Cuidado de Mascotas",
    "category_other": "Otro",
    
    // Chore Frequency
    "frequency_daily": "Diario",
    "frequency_weekly": "Semanal",
    "frequency_as_needed": "Según Necesidad",
    
    // Chore Status
    "chore_completed": "Completado",
    "chore_pending": "Pendiente",
    "chore_overdue": "Atrasado",
    "complete_chore": "Completar Tarea",
    "mark_complete": "Marcar Completado",
    "mark_incomplete": "Marcar Incompleto",
    
    // Rewards & Earnings
    "daily_reward": "Recompensa Diaria",
    "weekly_bonus": "Bono Semanal",
    "total_earnings": "Ganancias Totales",
    "this_week": "Esta Semana",
    "earnings": "Ganancias",
    "rewards": "Recompensas",
    "bonus": "Bono",
    
    // Time & Dates
    "today": "Hoy",
    "yesterday": "Ayer",
    "this_week": "Esta Semana",
    "last_week": "Semana Pasada",
    "monday": "Lunes",
    "tuesday": "Martes",
    "wednesday": "Miércoles",
    "thursday": "Jueves",
    "friday": "Viernes",
    "saturday": "Sábado",
    "sunday": "Domingo",
    
    // Settings
    "family_settings": "Configuración Familiar",
    "reward_settings": "Configuración de Recompensas",
    "currency": "Moneda",
    "date_format": "Formato de Fecha",
    "language": "Idioma",
    "timezone": "Zona Horaria",
    "notifications": "Notificaciones",
    "sound_enabled": "Sonido Habilitado",
    "email_notifications": "Notificaciones por Email",
    
    // Messages & Feedback
    "chore_added_success": "¡Tarea agregada exitosamente!",
    "chore_updated_success": "¡Tarea actualizada exitosamente!",
    "chore_deleted_success": "¡Tarea eliminada exitosamente!",
    "child_added_success": "¡Niño agregado exitosamente!",
    "child_updated_success": "¡Niño actualizado exitosamente!",
    "child_deleted_success": "¡Niño eliminado exitosamente!",
    "settings_updated_success": "¡Configuración actualizada exitosamente!",
    "language_changed_success": "¡Idioma cambiado exitosamente!",
    "please_fill_all_fields": "Por favor completa todos los campos",
    "something_went_wrong": "Algo salió mal. Por favor intenta de nuevo.",
    
    // Pluralization
    "chore_count": "{{count}} tarea",
    "chore_count_plural": "{{count}} tareas",
    "day_count": "{{count}} día",
    "day_count_plural": "{{count}} días",
    "week_count": "{{count}} semana",
    "week_count_plural": "{{count}} semanas",
    
    // Special Messages
    "welcome_message": "¡Bienvenido a ChoreStar!",
    "no_chores_today": "¡No hay tareas para hoy!",
    "all_chores_complete": "¡Todas las tareas completadas! ¡Buen trabajo!",
    "keep_up_good_work": "¡Sigue con el buen trabajo!",
    "family_teamwork": "¡El trabajo en equipo familiar hace que el sueño funcione!"
  },
  
  fr: {
    // Navigation & General
    "app_name": "ChoreStar",
    "dashboard": "Tableau de Bord",
    "chores": "Tâches",
    "settings": "Paramètres",
    "family": "Famille",
    "reports": "Rapports",
    "logout": "Déconnexion",
    "save": "Enregistrer",
    "cancel": "Annuler",
    "delete": "Supprimer",
    "edit": "Modifier",
    "add": "Ajouter",
    "close": "Fermer",
    "loading": "Chargement...",
    "error": "Erreur",
    "success": "Succès",
    "warning": "Avertissement",
    
    // Family Management
    "family_management": "Gestion Familiale",
    "add_child": "Ajouter un Enfant",
    "edit_child": "Modifier l'Enfant",
    "child_name": "Nom de l'Enfant",
    "child_age": "Âge",
    "child_avatar": "Avatar",
    "child_color": "Couleur",
    "child_icon": "Icône",
    "remove_child": "Supprimer l'Enfant",
    "confirm_remove_child": "Êtes-vous sûr de vouloir supprimer {{name}} ?",
    
    // Chore Management
    "chore_management": "Gestion des Tâches",
    "add_chore": "Ajouter une Tâche",
    "edit_chore": "Modifier la Tâche",
    "chore_name": "Nom de la Tâche",
    "chore_description": "Description",
    "chore_category": "Catégorie",
    "chore_reward": "Récompense",
    "chore_frequency": "Fréquence",
    "chore_assigned_to": "Assigné À",
    "remove_chore": "Supprimer la Tâche",
    "confirm_remove_chore": "Êtes-vous sûr de vouloir supprimer cette tâche ?",
    
    // Chore Categories
    "category_cleaning": "Nettoyage",
    "category_kitchen": "Cuisine",
    "category_outdoor": "Extérieur",
    "category_laundry": "Lessive",
    "category_pet_care": "Soins des Animaux",
    "category_other": "Autre",
    
    // Chore Frequency
    "frequency_daily": "Quotidien",
    "frequency_weekly": "Hebdomadaire",
    "frequency_as_needed": "Selon Besoin",
    
    // Chore Status
    "chore_completed": "Terminé",
    "chore_pending": "En Attente",
    "chore_overdue": "En Retard",
    "complete_chore": "Terminer la Tâche",
    "mark_complete": "Marquer Terminé",
    "mark_incomplete": "Marquer Incomplet",
    
    // Rewards & Earnings
    "daily_reward": "Récompense Quotidienne",
    "weekly_bonus": "Bonus Hebdomadaire",
    "total_earnings": "Gains Totaux",
    "this_week": "Cette Semaine",
    "earnings": "Gains",
    "rewards": "Récompenses",
    "bonus": "Bonus",
    
    // Time & Dates
    "today": "Aujourd'hui",
    "yesterday": "Hier",
    "this_week": "Cette Semaine",
    "last_week": "Semaine Dernière",
    "monday": "Lundi",
    "tuesday": "Mardi",
    "wednesday": "Mercredi",
    "thursday": "Jeudi",
    "friday": "Vendredi",
    "saturday": "Samedi",
    "sunday": "Dimanche",
    
    // Settings
    "family_settings": "Paramètres Familiaux",
    "reward_settings": "Paramètres de Récompenses",
    "currency": "Devise",
    "date_format": "Format de Date",
    "language": "Langue",
    "timezone": "Fuseau Horaire",
    "notifications": "Notifications",
    "sound_enabled": "Son Activé",
    "email_notifications": "Notifications par Email",
    
    // Messages & Feedback
    "chore_added_success": "Tâche ajoutée avec succès !",
    "chore_updated_success": "Tâche mise à jour avec succès !",
    "chore_deleted_success": "Tâche supprimée avec succès !",
    "child_added_success": "Enfant ajouté avec succès !",
    "child_updated_success": "Enfant mis à jour avec succès !",
    "child_deleted_success": "Enfant supprimé avec succès !",
    "settings_updated_success": "Paramètres mis à jour avec succès !",
    "language_changed_success": "Langue changée avec succès !",
    "please_fill_all_fields": "Veuillez remplir tous les champs",
    "something_went_wrong": "Quelque chose s'est mal passé. Veuillez réessayer.",
    
    // Pluralization
    "chore_count": "{{count}} tâche",
    "chore_count_plural": "{{count}} tâches",
    "day_count": "{{count}} jour",
    "day_count_plural": "{{count}} jours",
    "week_count": "{{count}} semaine",
    "week_count_plural": "{{count}} semaines",
    
    // Special Messages
    "welcome_message": "Bienvenue dans ChoreStar !",
    "no_chores_today": "Aucune tâche pour aujourd'hui !",
    "all_chores_complete": "Toutes les tâches terminées ! Bon travail !",
    "keep_up_good_work": "Continuez le bon travail !",
    "family_teamwork": "Le travail d'équipe familial fait fonctionner le rêve !"
  },
  
  de: {
    // Navigation & General
    "app_name": "ChoreStar",
    "dashboard": "Dashboard",
    "chores": "Aufgaben",
    "settings": "Einstellungen",
    "family": "Familie",
    "reports": "Berichte",
    "logout": "Abmelden",
    "save": "Speichern",
    "cancel": "Abbrechen",
    "delete": "Löschen",
    "edit": "Bearbeiten",
    "add": "Hinzufügen",
    "close": "Schließen",
    "loading": "Laden...",
    "error": "Fehler",
    "success": "Erfolg",
    "warning": "Warnung",
    
    // Family Management
    "family_management": "Familienverwaltung",
    "add_child": "Kind Hinzufügen",
    "edit_child": "Kind Bearbeiten",
    "child_name": "Kindername",
    "child_age": "Alter",
    "child_avatar": "Avatar",
    "child_color": "Farbe",
    "child_icon": "Symbol",
    "remove_child": "Kind Entfernen",
    "confirm_remove_child": "Sind Sie sicher, dass Sie {{name}} entfernen möchten?",
    
    // Chore Management
    "chore_management": "Aufgabenverwaltung",
    "add_chore": "Aufgabe Hinzufügen",
    "edit_chore": "Aufgabe Bearbeiten",
    "chore_name": "Aufgabenname",
    "chore_description": "Beschreibung",
    "chore_category": "Kategorie",
    "chore_reward": "Belohnung",
    "chore_frequency": "Häufigkeit",
    "chore_assigned_to": "Zugewiesen An",
    "remove_chore": "Aufgabe Entfernen",
    "confirm_remove_chore": "Sind Sie sicher, dass Sie diese Aufgabe entfernen möchten?",
    
    // Chore Categories
    "category_cleaning": "Reinigung",
    "category_kitchen": "Küche",
    "category_outdoor": "Draußen",
    "category_laundry": "Wäsche",
    "category_pet_care": "Tierpflege",
    "category_other": "Andere",
    
    // Chore Frequency
    "frequency_daily": "Täglich",
    "frequency_weekly": "Wöchentlich",
    "frequency_as_needed": "Bei Bedarf",
    
    // Chore Status
    "chore_completed": "Abgeschlossen",
    "chore_pending": "Ausstehend",
    "chore_overdue": "Überfällig",
    "complete_chore": "Aufgabe Abschließen",
    "mark_complete": "Als Abgeschlossen Markieren",
    "mark_incomplete": "Als Unvollständig Markieren",
    
    // Rewards & Earnings
    "daily_reward": "Tägliche Belohnung",
    "weekly_bonus": "Wöchentlicher Bonus",
    "total_earnings": "Gesamteinnahmen",
    "this_week": "Diese Woche",
    "earnings": "Einnahmen",
    "rewards": "Belohnungen",
    "bonus": "Bonus",
    
    // Time & Dates
    "today": "Heute",
    "yesterday": "Gestern",
    "this_week": "Diese Woche",
    "last_week": "Letzte Woche",
    "monday": "Montag",
    "tuesday": "Dienstag",
    "wednesday": "Mittwoch",
    "thursday": "Donnerstag",
    "friday": "Freitag",
    "saturday": "Samstag",
    "sunday": "Sonntag",
    
    // Settings
    "family_settings": "Familieneinstellungen",
    "reward_settings": "Belohnungseinstellungen",
    "currency": "Währung",
    "date_format": "Datumsformat",
    "language": "Sprache",
    "timezone": "Zeitzone",
    "notifications": "Benachrichtigungen",
    "sound_enabled": "Ton Aktiviert",
    "email_notifications": "E-Mail-Benachrichtigungen",
    
    // Messages & Feedback
    "chore_added_success": "Aufgabe erfolgreich hinzugefügt!",
    "chore_updated_success": "Aufgabe erfolgreich aktualisiert!",
    "chore_deleted_success": "Aufgabe erfolgreich gelöscht!",
    "child_added_success": "Kind erfolgreich hinzugefügt!",
    "child_updated_success": "Kind erfolgreich aktualisiert!",
    "child_deleted_success": "Kind erfolgreich entfernt!",
    "settings_updated_success": "Einstellungen erfolgreich aktualisiert!",
    "language_changed_success": "Sprache erfolgreich geändert!",
    "please_fill_all_fields": "Bitte füllen Sie alle Felder aus",
    "something_went_wrong": "Etwas ist schief gelaufen. Bitte versuchen Sie es erneut.",
    
    // Pluralization
    "chore_count": "{{count}} Aufgabe",
    "chore_count_plural": "{{count}} Aufgaben",
    "day_count": "{{count}} Tag",
    "day_count_plural": "{{count}} Tage",
    "week_count": "{{count}} Woche",
    "week_count_plural": "{{count}} Wochen",
    
    // Special Messages
    "welcome_message": "Willkommen bei ChoreStar!",
    "no_chores_today": "Keine Aufgaben für heute!",
    "all_chores_complete": "Alle Aufgaben abgeschlossen! Gute Arbeit!",
    "keep_up_good_work": "Weiter so gute Arbeit!",
    "family_teamwork": "Familien-Teamwork macht den Traum wahr!"
  }
};

// Simple translation function
function t(key, options = {}) {
  const currentLang = window.currentLanguage || 'en';
  const translation = translations[currentLang]?.[key] || translations['en']?.[key] || key;
  
  // Handle interpolation (replace {{variable}} with values)
  return translation.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
    return options[variable] || match;
  });
}

// Change language function
function changeLanguage(lang) {
  if (translations[lang]) {
    window.currentLanguage = lang;
    localStorage.setItem('chorestar_language', lang);
    
    // Trigger language change event
    window.dispatchEvent(new CustomEvent('languageChanged', { 
      detail: { language: lang } 
    }));
    
    return true;
  }
  return false;
}

// Get current language
function getCurrentLanguage() {
  return window.currentLanguage || 'en';
}

// Get available languages
function getAvailableLanguages() {
  return Object.keys(translations);
}

// Initialize language from localStorage or browser
function initLanguage() {
  const savedLang = localStorage.getItem('chorestar_language');
  const browserLang = navigator.language.split('-')[0]; // Get language code (en, es, etc.)
  
  if (savedLang && translations[savedLang]) {
    window.currentLanguage = savedLang;
  } else if (translations[browserLang]) {
    window.currentLanguage = browserLang;
  } else {
    window.currentLanguage = 'en';
  }
  
  localStorage.setItem('chorestar_language', window.currentLanguage);
}

// Initialize on load
if (typeof window !== 'undefined') {
  initLanguage();
}

// Export functions for global use
window.i18n = {
  t,
  changeLanguage,
  getCurrentLanguage,
  getAvailableLanguages,
  initLanguage
};

// Make t function globally available for convenience
window.t = t;
