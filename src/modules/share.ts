import html2canvas from "html2canvas-pro";
import { getTime } from "../utils/utils";

export function initShare() {
  document.body.classList.toggle("can-share", !!navigator.share);
  document.getElementById("share")?.addEventListener("click", shareQuote);
  document.getElementById("download")?.addEventListener("click", downloadQuote);
}

function getQuoteFileName() {
  const time = getTime();
  return `quote_${time.replace(":", "_")}.png`;
}

async function getCanvas() {
  const quote = document.getElementById("quote");

  if (quote) {
    const canvas = await html2canvas(document.body, {
      allowTaint: true,
      useCORS: true,
      scale: 2,
      onclone(_document, element) {
        element.classList.add("safe-screenshot");
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
      const filesArray = [
        new File([blob], getQuoteFileName(), {
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

  if (url) {
    const a = document.createElement("a");

    a.style.display = "none";
    a.setAttribute("href", url);
    a.setAttribute("download", getQuoteFileName());
    document.body.appendChild(a);

    a.click();
    a.remove();
  }
}
