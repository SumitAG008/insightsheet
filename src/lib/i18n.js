import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const LANG_KEY = 'app:language';

const DICTIONARY = {
  en: {
    nav_dashboard: 'Dashboard',
    nav_overview: 'Overview',
    nav_file_analysis: 'File Analysis',
    nav_analyzer: 'Analyzer',
    nav_auto_standardize: 'Auto-Standardize',
    nav_reconciliation: 'Reconciliation',
    nav_pl_builder: 'P&L Builder',
    nav_ai_assistant: 'AI Assistant',
    nav_data_schema: 'Data & Schema',
    nav_db_schema: 'DB Schema',
    nav_db_connect: 'DB Connect',
    nav_file_conversion: 'File Conversion',
    nav_excel_to_ppt: 'Excel to PPT',
    nav_ocr_to_doc_pdf: 'OCR to DOC/PDF',
    nav_document_converter: 'Document Converter (PDF / DOC / PPT)',
    nav_zip_cleaner: 'ZIP Cleaner',
    nav_developers: 'Developers',
    nav_pricing: 'Pricing',
    nav_account: 'Account',
    nav_onboarding: 'Onboarding',
    nav_settings: 'Settings',
    nav_security: 'Security',
    nav_logout: 'Logout',
    nav_login: 'Login',
    footer_tagline: 'Privacy-first data & file management',
    footer_legal: 'Legal',
    footer_privacy_policy: 'Privacy Policy',
    footer_faq: 'FAQ',
    footer_disclaimer_terms: 'Disclaimer & Terms',
    footer_privacy_first: 'Privacy First',
    footer_privacy_line1: '100% browser processing',
    footer_privacy_line2: 'Zero data storage',
    footer_privacy_line3: 'No tracking',
    settings_title: 'Settings',
    settings_subtitle: 'Manage your profile, language, and password.',
    profile_title: 'Profile',
    profile_email: 'Email',
    profile_full_name: 'Full name',
    profile_save: 'Save Profile',
    language_title: 'Language',
    language_app_language: 'App language',
    language_save: 'Save Language',
    language_saved: 'Saved.',
    language_failed: 'Failed to save language preference.',
    language_note: 'Language preference is saved now. Full UI translation will be applied in the next step.',
    branding_title: 'Branding & Theme',
    branding_brand_name: 'Brand name',
    branding_logo_url: 'Logo URL (optional)',
    branding_primary_color: 'Primary color',
    branding_theme: 'Theme',
    branding_save: 'Save Branding',
    branding_reset: 'Reset',
    branding_note: 'Branding and theme settings are saved locally in your browser.',
    password_title: 'Change Password',
    password_email: 'Email',
    password_send_reset: 'Send Reset Email',
  },
  de: {
    nav_dashboard: 'Dashboard',
    nav_overview: 'Übersicht',
    nav_file_analysis: 'Dateianalyse',
    nav_analyzer: 'Analyse',
    nav_auto_standardize: 'Automatisch standardisieren',
    nav_reconciliation: 'Abstimmung',
    nav_pl_builder: 'GuV-Generator',
    nav_ai_assistant: 'KI-Assistent',
    nav_data_schema: 'Daten & Schema',
    nav_db_schema: 'DB-Schema',
    nav_db_connect: 'DB verbinden',
    nav_file_conversion: 'Dateikonvertierung',
    nav_excel_to_ppt: 'Excel zu PPT',
    nav_ocr_to_doc_pdf: 'OCR nach DOC/PDF',
    nav_document_converter: 'Dokumentkonverter (PDF / DOC / PPT)',
    nav_zip_cleaner: 'ZIP-Cleaner',
    nav_developers: 'Entwickler',
    nav_pricing: 'Preise',
    nav_account: 'Konto',
    nav_onboarding: 'Einführung',
    nav_settings: 'Einstellungen',
    nav_security: 'Sicherheit',
    nav_logout: 'Abmelden',
    nav_login: 'Anmelden',
    footer_tagline: 'Datenschutzorientierte Daten- und Dateiverwaltung',
    footer_legal: 'Rechtliches',
    footer_privacy_policy: 'Datenschutzerklärung',
    footer_faq: 'FAQ',
    footer_disclaimer_terms: 'Haftungsausschluss & Bedingungen',
    footer_privacy_first: 'Datenschutz zuerst',
    footer_privacy_line1: '100% Verarbeitung im Browser',
    footer_privacy_line2: 'Keine Datenspeicherung',
    footer_privacy_line3: 'Kein Tracking',
    settings_title: 'Einstellungen',
    settings_subtitle: 'Verwalte Profil, Sprache und Passwort.',
    profile_title: 'Profil',
    profile_email: 'E-Mail',
    profile_full_name: 'Vollständiger Name',
    profile_save: 'Profil speichern',
    language_title: 'Sprache',
    language_app_language: 'App-Sprache',
    language_save: 'Sprache speichern',
    language_saved: 'Gespeichert.',
    language_failed: 'Sprache konnte nicht gespeichert werden.',
    language_note: 'Die Spracheinstellung wurde gespeichert. Die vollständige Übersetzung folgt im nächsten Schritt.',
    branding_title: 'Branding & Design',
    branding_brand_name: 'Markenname',
    branding_logo_url: 'Logo-URL (optional)',
    branding_primary_color: 'Primärfarbe',
    branding_theme: 'Design',
    branding_save: 'Branding speichern',
    branding_reset: 'Zurücksetzen',
    branding_note: 'Branding- und Design-Einstellungen werden lokal in deinem Browser gespeichert.',
    password_title: 'Passwort ändern',
    password_email: 'E-Mail',
    password_send_reset: 'Reset-E-Mail senden',
  },
  fr: {
    nav_dashboard: 'Tableau de bord',
    nav_overview: 'Aperçu',
    nav_file_analysis: 'Analyse de fichiers',
    nav_analyzer: 'Analyseur',
    nav_auto_standardize: 'Standardisation automatique',
    nav_reconciliation: 'Rapprochement',
    nav_pl_builder: 'Générateur de résultats (P&L)',
    nav_ai_assistant: 'Assistant IA',
    nav_data_schema: 'Données & Schéma',
    nav_db_schema: 'Schéma de base de données',
    nav_db_connect: 'Connexion base de données',
    nav_file_conversion: 'Conversion de fichiers',
    nav_excel_to_ppt: 'Excel vers PPT',
    nav_ocr_to_doc_pdf: 'OCR vers DOC/PDF',
    nav_document_converter: 'Convertisseur de documents (PDF / DOC / PPT)',
    nav_zip_cleaner: 'Nettoyeur ZIP',
    nav_developers: 'Développeurs',
    nav_pricing: 'Tarifs',
    nav_account: 'Compte',
    nav_onboarding: 'Parcours d’accueil',
    nav_settings: 'Paramètres',
    nav_security: 'Sécurité',
    nav_logout: 'Déconnexion',
    nav_login: 'Connexion',
    footer_tagline: 'Gestion des données et des fichiers centrée sur la confidentialité',
    footer_legal: 'Légal',
    footer_privacy_policy: 'Politique de confidentialité',
    footer_faq: 'FAQ',
    footer_disclaimer_terms: 'Avertissement & Conditions',
    footer_privacy_first: 'Confidentialité d’abord',
    footer_privacy_line1: 'Traitement 100% dans le navigateur',
    footer_privacy_line2: 'Zéro stockage de données',
    footer_privacy_line3: 'Aucun suivi',
    settings_title: 'Paramètres',
    settings_subtitle: 'Gérez votre profil, la langue et le mot de passe.',
    profile_title: 'Profil',
    profile_email: 'E-mail',
    profile_full_name: 'Nom complet',
    profile_save: 'Enregistrer le profil',
    language_title: 'Langue',
    language_app_language: 'Langue de l’application',
    language_save: 'Enregistrer la langue',
    language_saved: 'Enregistré.',
    language_failed: 'Impossible d’enregistrer la langue.',
    language_note: 'La préférence de langue est enregistrée. La traduction complète sera appliquée à l’étape suivante.',
    branding_title: 'Marque & Thème',
    branding_brand_name: 'Nom de la marque',
    branding_logo_url: 'URL du logo (optionnel)',
    branding_primary_color: 'Couleur principale',
    branding_theme: 'Thème',
    branding_save: 'Enregistrer la marque',
    branding_reset: 'Réinitialiser',
    branding_note: 'Les paramètres de marque et de thème sont enregistrés localement dans votre navigateur.',
    password_title: 'Changer le mot de passe',
    password_email: 'E-mail',
    password_send_reset: 'Envoyer un e-mail de réinitialisation',
  },
};

function safeGetStoredLanguage() {
  try {
    return localStorage.getItem(LANG_KEY) || 'en';
  } catch {
    return 'en';
  }
}

function safeSetStoredLanguage(lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // ignore
  }
}

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => safeGetStoredLanguage());

  const setLanguage = useCallback((lang) => {
    const next = lang || 'en';
    setLanguageState(next);
    safeSetStoredLanguage(next);
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e?.key === LANG_KEY) {
        setLanguageState(e?.newValue || 'en');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const t = useCallback(
    (key) => {
      const dict = DICTIONARY[language] || DICTIONARY.en;
      return dict[key] || DICTIONARY.en[key] || key;
    },
    [language]
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return React.createElement(LanguageContext.Provider, { value }, children);
}

export function useI18n() {
  return useContext(LanguageContext);
}
