export const LOCALES = {
    en: {
        document_title: 'Literature clock',
        add_quote: 'Add quote',
        made_by: 'Made by',
        project: 'Project',
        work_mode: 'Work',
        zen_mode: 'Zen',
        title: 'Title',
        author: 'Author',
        language: 'Language',
        theme: 'Theme',
        // Title attr
        zen_mode_title: 'Remove everything that distracts you',
        work_mode_title: 'Show only safe for work quotes',
        exit_zen_title: 'Exit Zen mode',
        // Themes
        system: 'System',
        light: 'Light',
        dark: 'Dark',
        base: 'Base',
        pink: 'Pink',
        green: 'Green',
        orange: 'Orange',
        purple: 'Purple',
        blue: 'Blue',
        gray: 'Gray',
        // Locales
        english: 'English',
        spanish: 'Spanish',
        portuguese: 'Portuguese',
        french: 'French',
        italian: 'Italian',
    },
    es: {
        document_title: 'Reloj Literario',
        add_quote: 'Agregar cita',
        made_by: 'Hecho por',
        project: 'Proyecto',
        zen_mode_title: 'Quitá todo lo que distraiga',
        work_mode_title: 'Mostrar solo citas seguras para ver en el trabajo',
        work_mode: 'Trabajo',
        zen_mode: 'Zen',
        exit_zen_title: 'Exit Zen mode',
        title: 'Título',
        author: 'Autor',
        language: 'Lenguaje',
        theme: 'Tema',
        system: 'Sistema',
        light: 'Claro',
        dark: 'Oscuro',
        base: 'Base',
        pink: 'Rosa',
        green: 'Verde',
        orange: 'Naranja',
        purple: 'Púrpura',
        blue: 'Azul',
        gray: 'Gris',
        english: 'Inglés',
        spanish: 'Español',
        portuguese: 'Portugués',
        french: 'Francés',
        italian: 'Italiano',
    },
    pt: {
        document_title: 'Relógio da Literatura',
        add_quote: 'Adicionar citação',
        made_by: 'Feito por',
        project: 'Projeto',
        work_mode: 'Modo de trabalho',
        zen_mode: 'Modo Zen',
        title: 'Título',
        author: 'Autor',
        language: 'Idioma',
        theme: 'Tema',
        zen_mode_title: 'Remova tudo o que te distrai',
        work_mode_title: 'Mostrar apenas citações seguras para o trabalho',
        exit_zen_title: 'Sair do modo Zen',
        system: 'Sistema',
        light: 'Claro',
        dark: 'Escuro',
        base: 'Base',
        pink: 'Rosa',
        green: 'Verde',
        orange: 'Laranja',
        purple: 'Roxo',
        blue: 'Azul',
        gray: 'Cinza',
        english: 'Inglês',
        spanish: 'Espanhol',
        portuguese: 'Português',
        french: 'Francês',
        italian: 'Italiano',
    },
    fr: {
        document_title: 'Horloge de la littérature',
        add_quote: 'Ajouter une citation',
        made_by: 'Fait par',
        project: 'Projet',
        work_mode: 'Mode de travail',
        zen_mode: 'Mode Zen',
        title: 'Titre',
        author: 'Auteur',
        language: 'Langue',
        theme: 'Thème',
        zen_mode_title: 'Supprimez tout ce qui vous distrait',
        work_mode_title: 'Afficher uniquement des citations appropriées pour le travail',
        exit_zen_title: 'Quitter le mode Zen',
        system: 'Système',
        light: 'Clair',
        dark: 'Sombre',
        base: 'Base',
        pink: 'Rose',
        green: 'Vert',
        orange: 'Orange',
        purple: 'Violet',
        blue: 'Bleu',
        gray: 'Gris',
        english: 'Anglais',
        spanish: 'Espagnol',
        portuguese: 'Portugais',
        french: 'Français',
        italian: 'Italien',
    },
    it: {
        document_title: 'Orologio della letteratura',
        add_quote: 'Aggiungi citazione',
        made_by: 'Realizzato da',
        project: 'Progetto',
        work_mode: 'Modalità di lavoro',
        zen_mode: 'Modalità Zen',
        title: 'Titolo',
        author: 'Autore',
        language: 'Lingua',
        theme: 'Tema',
        zen_mode_title: 'Rimuovi tutto ciò che ti distrae',
        work_mode_title: 'Mostra solo citazioni appropriate per il lavoro',
        exit_zen_title: 'Esci dalla modalità Zen',
        system: 'Sistema',
        light: 'Chiaro',
        dark: 'Scuro',
        base: 'Base',
        pink: 'Rosa',
        green: 'Verde',
        orange: 'Arancione',
        purple: 'Viola',
        blue: 'Blu',
        gray: 'Grigio',
        english: 'Inglese',
        spanish: 'Spagnolo',
        portuguese: 'Portoghese',
        french: 'Francese',
        italian: 'Italiano',
    }    
}

const TEXT_CONTENT = {
    'zen-mode-label': 'zen_mode',
    'work-mode-label': 'work_mode',
    'add-quote': 'add_quote',
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

export function getLocale(newLocale) {
    let locale = navigator.language?.substring(0, 2);
    const localeLocalStorage = localStorage.getItem("locale");
    const urlParams = new URLSearchParams(window.location.search);
    const localeQueryParam = urlParams.get('locale');
    const localeSelect = document.getElementById('language-select');


    locale = localeQueryParam || newLocale || localeLocalStorage || locale;

    if (!Object.keys(LOCALES).includes(locale) || !locale.length) {
        locale = 'en';
    }

    localeSelect.value = locale;
    localStorage.setItem('locale', locale);

    return locale;
}

export function getStrings(locale) {
    return LOCALES[locale] ? LOCALES[locale] : LOCALES['en'];
}

export function setLocale(newLocale) {
    const locale = getLocale(newLocale);
    const strings = getStrings(locale);

    document.title = strings.document_title;

    Object.entries(TEXT_CONTENT).forEach(([id, key]) => {
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
        options.forEach(o => o.textContent = strings[o.value])
    })
}