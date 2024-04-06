export const LOCALES = {
    en: {
        document_title: 'Literature clock',
        add_quote: 'Add quote',
        made_by: 'Made by',
        project: 'Project',
        zen_mode_title: 'Remove everything that distracts you',
        work_mode_title: 'Show only safe for work quotes',
        work_mode: 'Work',
        zen_mode: 'Zen',
        exit_zen_title: 'Exit Zen mode',
        title: 'Title',
        author: 'Author',
        language: 'Language',
        theme: 'Theme',
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
    },
    pt: {
        document_title: 'Relógio de literatura',
        add_quote: 'Adicionar cotação',
        made_by: 'Feito por',
        project: 'Projeto',
        zen_mode_title: 'Remova tudo que te distrai',
        work_mode_title: 'Mostrar apenas cotações seguras para trabalho',
        work_mode: 'Trabalho',
        zen_mode: 'Zen',
        exit_zen_title: 'Sair do modo Zen',
        title: 'Título',
        author: 'Autor',
        language: 'Idioma',
        theme: 'Tema',
    },
    fr: {
        document_title: 'Horloge littéraire',
        add_quote: 'Ajouter un devis',
        made_by: 'Faite par',
        project: 'Projet',
        zen_mode_title: 'Supprimez tout ce qui vous distrait',
        work_mode_title: 'Afficher uniquement les devis de sécurité pour le travail',
        work_mode: 'Travail',
        zen_mode: 'Zen',
        exit_zen_title: 'Quitter le mode Zen',
        title: 'Titre',
        author: 'Auteur',
        language: 'Langue',
        theme: 'Thème',
    },
    it: {
        document_title: 'Orologio della letteratura',
        add_quote: 'Aggiungi citazione',
        made_by: 'Fatto da',
        project: 'Progetto',
        zen_mode_title: 'Rimuovi tutto ciò che ti distrae',
        work_mode_title: 'Mostra solo cassaforte per preventivi di lavoro',
        work_mode: 'Lavoro',
        zen_mode: 'Zen',
        exit_zen_title: 'Esci dalla modalità Zen',
        title: 'Titolo',
        author: 'Autore',
        language: 'Lingua',
        theme: 'Tema',
    }
}

const TEXT_CONTENT = {
    'zen-mode': 'zen_mode',
    'work-mode': 'work_mode',
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

    locale = localeQueryParam || newLocale || localeLocalStorage;

    if (!Object.keys(LOCALES).includes(locale)) {
        locale = 'en';
    }

    localStorage.setItem('locale', locale);
    document.getElementById("language-select").value = locale;

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
}