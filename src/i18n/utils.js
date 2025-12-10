import { defaultLanguage, languages } from './config';

// Import all translation files
import en from './translations/en';
import es from './translations/es';

// Create a translations object with all translations
export const translations = { en, es };

// Get the language from the URL
export function getLanguageFromURL(url) {
  const [, lang] = url.pathname.split('/');
  if (lang in languages) {
    return lang;
  }
  return defaultLanguage;
}

// Get the current language
export function useTranslations(lang) {
  return translations[lang] || translations[defaultLanguage];
}

// Generate localized URLs
export function getLocalizedURL(path, lang) {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;

  // For default language, don't add language prefix (for SEO purposes)
  if (lang === defaultLanguage) {
    return `/${cleanPath}`;
  }

  return `/${lang}/${cleanPath}`;
}

// Get alternate URLs for language switcher
export function getAlternateURLs(currentPath, currentLang) {
  const urls = {};

  if (currentPath.includes('/service/')) {
    let slug = '';
    if (currentPath.includes('/service/')) {
      slug = currentPath.split('/service/')[1];
    }
    
    Object.keys(languages).forEach(lang => {
      if (lang === 'en') {
        urls[lang] = `/service/${slug}`;
      } else {
        urls[lang] = `/${lang}/service/${slug}`;
      }
    });

    return urls;
  }

  // Special handling for contact pages
  if (currentPath === '/contact' || currentPath === '/es/contact') {
    Object.keys(languages).forEach(lang => {
      if (lang === 'es') {
        urls[lang] = `/${lang}/contact`;
      } else {
        urls[lang] = '/contact';
      }
    });

    return urls;
  }

  // Regular handling for other pages
  let path = currentPath;
  // Remove language prefix from path if present
  if (currentLang !== defaultLanguage && path.startsWith(`/${currentLang}/`)) {
    path = path.replace(`/${currentLang}/`, '');
  } else if (currentLang === defaultLanguage && path.startsWith(`/${defaultLanguage}/`)) {
    path = path.replace(`/${defaultLanguage}/`, '');
  }

  // Generate URLs for all languages
  Object.keys(languages).forEach(lang => {
    urls[lang] = getLocalizedURL(path, lang);
  });

  return urls;
}