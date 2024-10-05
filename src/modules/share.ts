import html2canvas from "html2canvas-pro";

export function initShare() {
  document.getElementById("share")?.addEventListener("click", shareQuote);
}

async function shareQuote() {
  const quote = document.getElementById("quote");

  if (quote) {
    const canvas = await html2canvas(document.body);

    // @ts-ignore
    if (navigator.share) {
      canvas.toBlob((blob) => {
        if (blob) {
          const filesArray = [
            new File([blob], "quote.png", {
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
  a.setAttribute("download", "quote.png");
  document.body.appendChild(a);

  a.click();
  a.remove();
}
