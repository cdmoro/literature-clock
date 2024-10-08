import html2canvas from "html2canvas-pro";
import { getTime } from "../utils/utils";
import { getStringSetting } from "../utils/settings";
import { getStrings } from "./locales";

export function initShare() {
  const share = document.getElementById("share");

  document.getElementById("download")?.addEventListener("click", downloadQuote);

  if (!!navigator.share) {
    share?.addEventListener("click", shareQuote);
  } else {
    share?.remove();
  }
}

async function getCanvas() {
  const quote = document.getElementById("quote");

  if (quote) {
    const canvas = await html2canvas(document.body, {
      allowTaint: true,
      useCORS: true,
      scale: 2,
      onclone(_document, element) {
        element.classList.add("share-quote");
        element.classList.remove("screensaver");
      },
    });

    const flashEl = document.createElement("div");
    flashEl.id = "flash";
    document.body.appendChild(flashEl);
  
    setTimeout(() => {
      flashEl.remove();
    }, 500);

    return canvas;
  }
}

async function shareQuote() {
  const canvas = await getCanvas();

  canvas?.toBlob((blob) => {
    if (blob) {
      const time = getTime();
      const strings = getStrings();
      const filesArray = [
        new File([blob], `Quote ${time}.png`, {
          type: "image/png",
          lastModified: new Date().getTime(),
        }),
      ];

      const url = new URL("https://literatureclock.netlify.app/");
      const locale = getStringSetting("locale");
      const theme = getStringSetting("theme");

      if (locale) {
        url.searchParams.append("locale", locale);
      }

      if (theme) {
        url.searchParams.append("theme", theme);
      }

      const shareData = {
        files: filesArray,
        text: `${strings.document_title}`,
        url: url.toString()
      }

      if (navigator.canShare && navigator.canShare(shareData)) {
        navigator.share(shareData);
      }
    }
  });
}

async function downloadQuote() {
  const canvas = await getCanvas();
  const url = canvas?.toDataURL("image/png");
  const time = getTime();

  if (url) {
    const a = document.createElement("a");

    a.style.display = "none";
    a.setAttribute("href", url);
    a.setAttribute("download", `quote_${time.replace(":", "_")}.png`);
    document.body.appendChild(a);

    a.click();
    a.remove();
  }
}
