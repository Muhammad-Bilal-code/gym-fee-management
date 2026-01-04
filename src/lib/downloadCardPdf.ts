import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/** ✅ Blob generator (Download + Share dono yahan se use karenge) */
export async function renderCardPdfBlob(el: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(el, {
    scale: 3,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    // ✅ reduce chances of picking global styles
    onclone: (doc) => {
      doc.documentElement.style.background = "#ffffff";
      doc.body.style.background = "#ffffff";
      doc.body.style.margin = "0";
      doc.body.style.padding = "0";

      // ✅ html2canvas cannot parse oklch(...) -> force safe colors in cloned DOM
      const style = doc.createElement("style");
      style.textContent = `
    /* override shadcn/tailwind token based oklch colors in the clone */
    :root, body {
      background: #ffffff;
      color: #111827;
    }

    /* Tailwind/shadcn often sets border-color via global selectors using oklch vars */
    * {
      border-color: rgba(0,0,0,0);
      outline-color: rgba(0,0,0,0);
      caret-color: auto;
    }
  `;
      doc.head.appendChild(style);
    },
  });

  const imgData = canvas.toDataURL("image/png", 1.0);

  // Card size based PDF (landscape-ish). We'll fit exact image.
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: [canvas.width, canvas.height],
  });

  pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);

  // ✅ jsPDF v4: output("blob") works
  const blob = pdf.output("blob") as Blob;
  return blob;
}

export async function downloadCardAsPdf(el: HTMLElement, filename: string) {
  const blob = await renderCardPdfBlob(el);

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** phone: "0344-0208268" -> "923440208268" */
function toWhatsAppNumberPK(phone: string) {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("92")) return digits;
  if (digits.startsWith("0")) return "92" + digits.slice(1);
  // fallback: treat as already international
  return digits;
}

/**
 * ✅ Share on WhatsApp:
 * - If device supports Web Share with files (mostly mobiles): directly share PDF file.
 * - Else: open WhatsApp chat with prefilled text, and user manually attach downloaded PDF.
 */
export async function shareCardOnWhatsApp(
  element: HTMLElement,
  fileName = "member-card.pdf"
) {
  const blob = await renderCardPdfBlob(element);

  const url = URL.createObjectURL(blob);

  const text = encodeURIComponent(`My gym member card 📄\n\n${url}`);

  const whatsappUrl = `https://wa.me/?text=${text}`;

  window.open(whatsappUrl, "_blank");

  // optional cleanup (delay so WhatsApp can read it)
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60_000);
}
