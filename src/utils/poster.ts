import QRCode from "qrcode";

let html2canvasModule: typeof import("html2canvas") | null = null;

async function loadHtml2Canvas() {
  if (!html2canvasModule) {
    html2canvasModule = await import("html2canvas");
  }
  return html2canvasModule.default;
}

export async function generateQRCode(container: HTMLElement, url: string): Promise<void> {
  try {
    const dataUrl = await QRCode.toDataURL(url, { width: 160, margin: 1 });
    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = "QR Code";
    container.innerHTML = "";
    container.appendChild(img);
  } catch (err) {
    console.error("二维码生成失败:", err);
  }
}

export async function generatePoster(element: HTMLElement, title: string, defaultCover?: string): Promise<void> {
  const html2canvas = await loadHtml2Canvas();

  // 检查并处理封面图
  const coverImg = element.querySelector(".poster-cover") as HTMLImageElement;
  if (coverImg && defaultCover) {
    const needDefault =
      !coverImg.src || coverImg.src === window.location.href || !coverImg.complete || coverImg.naturalWidth === 0;
    if (needDefault) {
      coverImg.src = defaultCover;
      await new Promise<void>((resolve) => {
        coverImg.onload = () => resolve();
        coverImg.onerror = () => resolve();
        setTimeout(resolve, 3000);
      });
    }
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#fff",
  });
  const link = document.createElement("a");
  link.download = `${title || "海报"}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
