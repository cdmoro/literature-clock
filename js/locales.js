import { getTime } from "./utils.js";

export const LOCALES = {
    en: {
        document_title: 'Literature Clock',
        add_quote: 'Add quote',
        report_error: 'Report error',
        made_by: 'Made by',
        project: 'Project',
        work_mode: 'Work',
        zen_mode: 'Zen',
        title: 'Title',
        author: 'Author',
        // Title attr
        zen_mode_title: 'Remove everything that distracts you',
        work_mode_title: 'Show only safe for work quotes',
        exit_zen_title: 'Exit Zen mode',
        // Themes
        theme: 'Theme',
        colors: 'Colors',
        themes: 'Themes',
        base: 'Base',
        pink: 'Pink',
        green: 'Green',
        orange: 'Orange',
        purple: 'Purple',
        blue: 'Blue',
        gray: 'Gray',
        retro: 'Retro',
        elegant: 'Elegant',
        festive: 'Festive',
        bohemian: 'Bohemian',
        // Theme variants
        system: 'System',
        light: 'Light',
        dark: 'Dark',
        // Locales
        language: 'Language',
        en: 'English',
        es: 'Spanish',
        pt: 'Portuguese',
        fr: 'French',
        it: 'Italian',
        multi: 'Multilingual'
    },
    es: {
        document_title: 'Reloj Literario',
        add_quote: 'Agregar cita',
        report_error: 'Reportar error',
        made_by: 'Hecho por',
        project: 'Proyecto',
        work_mode: 'Trabajo',
        zen_mode: 'Zen',
        title: 'Título',
        author: 'Autor',
        language: 'Idioma',
        theme: 'Tema',
        zen_mode_title: 'Elimina todo lo que te distrae',
        work_mode_title: 'Mostrar solo citas seguras para el trabajo',
        exit_zen_title: 'Salir del modo Zen',
        colors: 'Colores',
        themes: 'Temas',
        base: 'Base',
        pink: 'Rosa',
        green: 'Verde',
        orange: 'Naranja',
        purple: 'Morado',
        blue: 'Azul',
        gray: 'Gris',
        retro: 'Retro',
        elegant: 'Elegante',
        festive: 'Festivo',
        bohemian: 'Bohemio',
        system: 'Sistema',
        light: 'Claro',
        dark: 'Oscuro',
        en: 'Inglés',
        es: 'Español',
        pt: 'Portugués',
        fr: 'Francés',
        it: 'Italiano',
        multi: 'Multilingüe'
    },
    pt: {
        document_title: 'Relógio da Literatura',
        add_quote: 'Adicionar citação',
        report_error: 'Informar erro',
        made_by: 'Feito por',
        project: 'Projeto',
        work_mode: 'Trabalho',
        zen_mode: 'Zen',
        title: 'Título',
        author: 'Autor',
        language: 'Idioma',
        theme: 'Tema',
        zen_mode_title: 'Remova tudo o que te distrai',
        work_mode_title: 'Mostrar apenas citações seguras para o trabalho',
        exit_zen_title: 'Sair do modo Zen',
        colors: 'Cores',
        themes: 'Temas',
        base: 'Base',
        pink: 'Rosa',
        green: 'Verde',
        orange: 'Laranja',
        purple: 'Roxo',
        blue: 'Azul',
        gray: 'Cinza',
        retro: 'Retrô',
        elegant: 'Elegante',
        festive: 'Festivo',
        bohemian: 'Boêmio',
        system: 'Sistema',
        light: 'Claro',
        dark: 'Escuro',
        en: 'Inglês',
        es: 'Espanhol',
        pt: 'Português',
        fr: 'Francês',
        it: 'Italiano',
        multi: 'Multilíngue'
    },
    fr: {
        document_title: 'Horloge de la Littérature',
        add_quote: 'Ajouter une citation',
        report_error: 'Informer l\'erreur',
        made_by: 'Fait par',
        project: 'Projet',
        work_mode: 'Travail',
        zen_mode: 'Zen',
        title: 'Titre',
        author: 'Auteur',
        language: 'Langue',
        theme: 'Thème',
        zen_mode_title: 'Supprimez tout ce qui vous distrait',
        work_mode_title: 'Afficher uniquement des citations appropriées pour le travail',
        exit_zen_title: 'Quitter le mode Zen',
        colors: 'Couleurs',
        themes: 'Thèmes',
        base: 'Base',
        pink: 'Rose',
        green: 'Vert',
        orange: 'Orange',
        purple: 'Violet',
        blue: 'Bleu',
        gray: 'Gris',
        retro: 'Rétro',
        elegant: 'Élégant',
        festive: 'Festif',
        bohemian: 'Bohémien',
        system: 'Système',
        light: 'Clair',
        dark: 'Sombre',
        en: 'Anglais',
        es: 'Espagnol',
        pt: 'Portugais',
        fr: 'Français',
        it: 'Italien',
        multi: 'Multilingue'
    },
    it: {
        document_title: 'Orologio della Letteratura',
        add_quote: 'Aggiungi citazione',
        report_error: 'Informare l\'errore',
        made_by: 'Realizzato da',
        project: 'Progetto',
        work_mode: 'Lavoro',
        zen_mode: 'Zen',
        title: 'Titolo',
        author: 'Autore',
        addQuote: 'Aggiungere una citazione',
        language: 'Lingua',
        theme: 'Tema',
        zen_mode_title: 'Rimuovi tutto ciò che ti distrae',
        work_mode_title: 'Mostra solo citazioni appropriate per il lavoro',
        exit_zen_title: 'Esci dalla modalità Zen',
        colors: 'Colori',
        themes: 'Temi',
        base: 'Base',
        pink: 'Rosa',
        green: 'Verde',
        orange: 'Arancione',
        purple: 'Viola',
        blue: 'Blu',
        gray: 'Grigio',
        retro: 'Retro',
        elegant: 'Elegante',
        festive: 'Festivo',
        bohemian: 'Bohemien',
        system: 'Sistema',
        light: 'Chiaro',
        dark: 'Scuro',
        en: 'Inglese',
        es: 'Spagnolo',
        pt: 'Portoghese',
        fr: 'Francese',
        it: 'Italiano',
        multi: 'Multilingua'
    }        
}

const LABELS = {
    'zen-mode': 'zen_mode',
    'work-mode-label': 'work_mode',
    'add-quote': 'add_quote',
    'report-error': 'report_error',
    'project': 'project',
    'made-by': 'made_by',
    'language': 'language',
    'theme': 'theme',
};

const TITLE_ATTR = {
    'zen-mode': 'zen_mode_title',
    'work-mode': 'work_mode_title',
    'exit-zen': 'exit_zen_title',
}

export function getRandomLocale() {
    const locales = Object.keys(LOCALES);
    return locales[Math.floor(Math.random() * locales.length)];
}

export function getLocale(newLocale) {
    let locale = navigator.language?.substring(0, 2);
    const localeLocalStorage = localStorage.getItem("locale");
    const urlParams = new URLSearchParams(window.location.search);
    const localeQueryParam = urlParams.get('locale');
    const localeSelect = document.getElementById('locale-select');

    locale = localeQueryParam || newLocale || localeLocalStorage || locale;

    if ((!Object.keys(LOCALES).includes(locale) || !locale.length) && locale !== 'multi') {
        locale = 'en';
    }

    if (localeSelect.value === 'multi') {
        localStorage.setItem('locale', 'multi');
    } else {
        localeSelect.value = locale;
        localStorage.setItem('locale', locale);
    }

    return locale;
}

export function getStrings(locale) {
    if (!locale) {
        locale = getLocale();
    }

    return LOCALES[locale] ? LOCALES[locale] : LOCALES['en'];
}

export function setLocale(newLocale) {
    const locale = getLocale(newLocale);
    const strings = getStrings(locale);

    document.documentElement.lang = locale === 'multi' ? 'en' : locale;
    document.title = strings.document_title;

    Object.entries(LABELS).forEach(([id, key]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = strings[key];
        }
    })

    Object.entries(TITLE_ATTR).forEach(([id, key]) => {
        const element = document.getElementById(id);
        if (element) {
            element.title = strings[key];
        }
    });

    ['locale', 'theme', 'variant'].forEach(select => {
        const options = document.querySelectorAll(`#${select}-select option`);
        options.forEach(op => op.textContent = strings[op.value])
    })

    document.querySelectorAll('select optgroup').forEach(el => el.label = strings[el.id]);
}
