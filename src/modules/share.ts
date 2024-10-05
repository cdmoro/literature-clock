import html2canvas from "html2canvas-pro";
import { getTime } from "../utils/utils";

export function initShare() {
  document.getElementById("share")?.addEventListener("click", shareQuote);
}

function getQuoteFileName() {
  const time = getTime();
  return `quote_${time.replace(":", "_")}.png`;
}

async function shareQuote() {
  const quote = document.getElementById("quote");

  if (quote) {
    const canvas = await html2canvas(document.body, {
      allowTaint: true,
      useCORS: true,
      scale: 2,
    });

    // @ts-ignore
    if (navigator.share) {
      canvas.toBlob((blob) => {
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
    } else {
      download(canvas.toDataURL("image/png"));
    }
  }
}

function download(url: string) {
  const a = document.createElement("a");

  a.style.display = "none";
  a.setAttribute("href", url);
  a.setAttribute("download", getQuoteFileName());
  document.body.appendChild(a);

  a.click();
  a.remove();
}
