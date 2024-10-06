import html2canvas from "html2canvas-pro";
import { getTime } from "../utils/utils";

export function initShare() {
  if (!!navigator.share) {
    document.getElementById("download")?.remove();
    document.getElementById("share")?.addEventListener("click", shareQuote);
  } else {
    document.getElementById("share")?.remove();
    document.getElementById("download")?.addEventListener("click", downloadQuote);
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
  const time = getTime();

  canvas?.toBlob((blob) => {
    if (blob) {
      const filesArray = [
        new File([blob], `Quote ${time}`, {
          type: blob.type,
          lastModified: new Date().getTime(),
        }),
      ];
      const shareData = {
        files: filesArray,
      };

      navigator.share(shareData);
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
