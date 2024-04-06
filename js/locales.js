export const locales = {
    en: {
        "document-title": "Literature clock",
        "add-quote": "Add quote",
        "made-by": "Made by",
        project: "Project",
        "zen-mode-title": "Remove everything that distracts you",
        "work-mode-title": "Show only safe for work quotes",
        "work-mode": "Work",
        "zen-mode": "Zen",
        "exit-zen-title": "Exit Zen mode",
        title: "Title",
        author: "Author",
    },
    es: {
        "document-title": "Reloj Literario",
        "add-quote": "Agregar cita",
        "made-by": "Hecho por",
        project: "Proyecto",
        "zen-mode-title": "Quitá todo lo que distraiga",
        "work-mode-title": "Mostrar solo citas seguras para ver en el trabajo",
        "work-mode": "Trabajo",
        "zen-mode": "Zen",
        "exit-zen-title": "Exit Zen mode",
        title: 'Título',
        author: "Autor",
    },
    pt: {
        "document-title": "Relógio de literatura",
        "add-quote": "Adicionar cotação",
        "made-by": "Feito por",
        project: "Projeto",
        "zen-mode-title": "Remova tudo que te distrai",
        "work-mode-title": "Mostrar apenas cotações seguras para trabalho",
        "work-mode": "Trabalho",
        "zen-mode": "Zen",
        "exit-zen-title": "Sair do modo Zen",
        title: 'Título',
        author: "Autor",
    },
    fr: {
        "document-title": "Horloge littéraire",
        "add-quote": "Ajouter un devis",
        "made-by": "Faite par",
        project: "Projet",
        "zen-mode-title": "Supprimez tout ce qui vous distrait",
        "work-mode-title": "Afficher uniquement les devis de sécurité pour le travail",
        "work-mode": "Travail",
        "zen-mode": "Zen",
        "exit-zen-title": "Quitter le mode Zen",
        title: 'Título',
        author: "Autor",
    },
    it: {
        "document-title": "Orologio della letteratura",
        "add-quote": "Aggiungi citazione",
        "made-by": "Fatto da",
        project: "Progetto",
        "zen-mode-title": "Rimuovi tutto ciò che ti distrae",
        "work-mode-title": "Mostra solo cassaforte per preventivi di lavoro",
        "work-mode": "Lavoro",
        "zen-mode": "Zen",
        "exit-zen-title": "Esci dalla modalità Zen",
        title: 'Título',
        author: "Autor",
    }
}

const TEXT_CONTENT = [
    'zen-mode',
    'work-mode',
    'add-quote',
    'project',
];

const TITLE_ATTR = {
    'zen-mode': 'zen-mode-title',
    'work-mode': 'work-mode-title',
    'exit-zen': 'exit-zen-title',
}

export function setLocale(newLocale) {
    let locale = navigator.language?.substring(0, 2);

    if (newLocale) {
        locale = newLocale;
    }

    const strings = locales[locale] ? locales[locale] : locales["en"];

    document.title = strings["document-title"];

    TEXT_CONTENT.forEach(id => {
        let element = document.getElementById(id);
        if (element) {
            element.textContent = strings[id];
        }
    })

    Object.entries(TITLE_ATTR).forEach(([id, key]) => {
        let element = document.getElementById(id);
        if (element) {
            element.title = strings[key];
        }
    });
}