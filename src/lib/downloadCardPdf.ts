import html2canvas from "html2canvas";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

// function oklchToRgb(
//   value: string,
//   prop:
//     | "color"
//     | "backgroundColor"
//     | "borderColor"
//     | "outlineColor"
//     | "boxShadow"
// ) {
//   const tmp = document.createElement("div");

//   // default safe base
//   tmp.style.color = "rgb(0,0,0)";
//   tmp.style.backgroundColor = "rgb(255,255,255)";
//   tmp.style.borderColor = "rgb(0,0,0)";
//   tmp.style.outlineColor = "rgb(0,0,0)";
//   tmp.style.boxShadow = "none";

//   // set the suspicious value
//   // @ts-ignore
//   tmp.style[prop] = value;

//   document.body.appendChild(tmp);
//   const out = getComputedStyle(tmp)[prop] as string;
//   tmp.remove();

//   return out;
// }

// function sanitizeOklchInTree(root: HTMLElement) {
//   const all = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];

//   for (const node of all) {
//     const cs = getComputedStyle(node);

//     // pick only the common culprits
//     const props: Array<
//       [
//         (
//           | "color"
//           | "backgroundColor"
//           | "borderColor"
//           | "outlineColor"
//           | "boxShadow"
//         ),
//         string
//       ]
//     > = [
//       ["color", cs.color],
//       ["backgroundColor", cs.backgroundColor],
//       ["borderColor", cs.borderTopColor], // enough; usually same on all sides
//       ["outlineColor", cs.outlineColor],
//       ["boxShadow", cs.boxShadow],
//     ];

//     for (const [prop, val] of props) {
//       if (val && val.includes("oklch(")) {
//         const rgb = oklchToRgb(val, prop);
//         // inline set so html2canvas reads rgb instead of oklch
//         // @ts-ignore
//         node.style[prop] = rgb;
//       }
//     }
//   }
// }

/** ✅ Blob generator (Download + Share dono yahan se use karenge) */
// export async function renderCardPdfBlob(el: HTMLElement): Promise<Blob> {
//   // const canvas = await html2canvas(el, {
//   //   scale: 3,
//   //   useCORS: true,
//   //   allowTaint: true,
//   //   backgroundColor: "#ffffff",
//   //   // ✅ reduce chances of picking global styles
//   //   onclone: (doc) => {
//   //     doc.documentElement.style.background = "#ffffff";
//   //     doc.body.style.background = "#ffffff";
//   //     doc.body.style.margin = "0";
//   //     doc.body.style.padding = "0";

//   //     // ✅ html2canvas cannot parse oklch(...) -> force safe colors in cloned DOM
//   //     const style = doc.createElement("style");
//   //     style.textContent = `
//   //   /* override shadcn/tailwind token based oklch colors in the clone */
//   //   :root, body {
//   //     background: #ffffff;
//   //     color: #111827;
//   //   }

//   //   /* Tailwind/shadcn often sets border-color via global selectors using oklch vars */
//   //   * {
//   //     border-color: rgba(0,0,0,0);
//   //     outline-color: rgba(0,0,0,0);
//   //     caret-color: auto;
//   //   }
//   // `;
//   //     doc.head.appendChild(style);
//   //   },
//   // });

//   const canvas = await html2canvas(el, {
//     scale: 3,
//     useCORS: true,
//     allowTaint: true,
//     backgroundColor: "#ffffff",

//     // ✅ key: avoid html2canvas color parser issues (oklch etc.)
//     foreignObjectRendering: true,

//     onclone: (doc) => {
//       doc.documentElement.style.background = "#ffffff";
//       doc.body.style.background = "#ffffff";
//       doc.body.style.margin = "0";
//       doc.body.style.padding = "0";

//       // ✅ 1) oklch killer (add back)
//       const style = doc.createElement("style");
//       style.textContent = `
//       :root, body { background:#fff !important; color:#111827 !important; }

//       /* stop parser hitting border/outline/ring colors that tailwind sets via oklch */
//       * {
//         border-color: rgba(0,0,0,0) !important;
//         outline-color: rgba(0,0,0,0) !important;
//         box-shadow: none !important;
//         text-shadow: none !important;
//       }
//     `;
//       doc.head.appendChild(style);

//       // ✅ 2) remove ancestor transforms (your layout issue)
//       const clonedCard = doc.querySelector(
//         '[data-pdf-card="member-card"]'
//       ) as HTMLElement | null;

//       if (clonedCard) {
//         let p: HTMLElement | null = clonedCard.parentElement;
//         while (p) {
//           p.style.transform = "none";
//           p.style.transformOrigin = "top left";
//           // @ts-ignore
//           p.style.zoom = "1";
//           p = p.parentElement;
//         }
//       }
//     },
//   });

//   const imgData = canvas.toDataURL("image/png", 1.0);

//   // Card size based PDF (landscape-ish). We'll fit exact image.
//   const pdf = new jsPDF({
//     orientation: "landscape",
//     unit: "pt",
//     format: [canvas.width, canvas.height],
//   });

//   pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);

//   // ✅ jsPDF v4: output("blob") works
//   const blob = pdf.output("blob") as Blob;
//   return blob;
// }
// export async function renderCardPdfBlob(el: HTMLElement): Promise<Blob> {
//   const clone = el.cloneNode(true) as HTMLElement;

//   const wrapper = document.createElement("div");
//   wrapper.style.position = "fixed";
//   wrapper.style.left = "-99999px";
//   wrapper.style.top = "0";
//   wrapper.style.background = "#ffffff";
//   wrapper.style.padding = "0";
//   wrapper.style.margin = "0";

//   // IMPORTANT: scale property mat use karo (not reliable)
//   clone.style.transform = "none";
//   clone.style.background = "#ffffff";

//   wrapper.appendChild(clone);
//   document.body.appendChild(wrapper);

//   // wait for fonts
//   // @ts-ignore
//   if (document.fonts?.ready) {
//     // @ts-ignore
//     await document.fonts.ready;
//   }

//   // ✅ THE FIX: convert any oklch(...) in computed styles to rgb(...) inline
//   sanitizeOklchInTree(clone);

//   const canvas = await html2canvas(clone, {
//     scale: 3,
//     backgroundColor: "#ffffff",
//     useCORS: true,
//     allowTaint: true,
//   });

//   document.body.removeChild(wrapper);

//   const imgData = canvas.toDataURL("image/png", 1.0);

//   const pdf = new jsPDF({
//     orientation: "landscape",
//     unit: "pt",
//     format: [canvas.width, canvas.height],
//   });

//   pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);

//   return pdf.output("blob") as Blob;
// }

export async function renderCardPdfBlob(el: HTMLElement): Promise<Blob> {
  // wait for fonts
  // @ts-ignore
  if (document.fonts?.ready) {
    // @ts-ignore
    await document.fonts.ready;
  }

  // generate high-quality png
  const dataUrl = await toPng(el, {
    cacheBust: true,
    pixelRatio: 3,
    backgroundColor: "#ffffff",
  });

  // create PDF
  const img = new Image();
  img.src = dataUrl;

  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("Image failed to load"));
  });

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: [img.width, img.height],
  });

  pdf.addImage(dataUrl, "PNG", 0, 0, img.width, img.height);
  return pdf.output("blob") as Blob;
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
