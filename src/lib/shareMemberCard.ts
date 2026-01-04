// import { supabase } from "@/lib/supabase";
// import { renderCardPdfBlob } from "@/lib/downloadCardPdf";

// function normalizePkPhone(phone: string) {
//   // "0344-0208268" -> "923440208268"
//   const digits = phone.replace(/\D/g, "");
//   if (digits.startsWith("0")) return "92" + digits.slice(1);
//   if (digits.startsWith("92")) return digits;
//   // fallback: if already without country code but starts with 3...
//   if (digits.startsWith("3")) return "92" + digits;
//   return digits;
// }

// export async function shareCardOnWhatsApp(opts: {
//   el: HTMLElement;
//   phone: string;
//   memberId: string; // display id
//   fileName?: string;
// }) {
//   const { el, phone, memberId } = opts;

//   // 1) generate pdf blob
//   const blob = await renderCardPdfBlob(el);

//   // 2) upload to supabase storage
//   const path = `cards/member-${memberId}-${Date.now()}.pdf`;

//   const { error: upErr } = await supabase.storage
//     .from("member-cards")
//     .upload(path, blob, {
//       contentType: "application/pdf",
//       upsert: true,
//     });

//   if (upErr) throw upErr;

//   // 3) signed url (24h)
//   const { data: signed, error: sErr } = await supabase.storage
//     .from("member-cards")
//     .createSignedUrl(path, 60 * 60 * 24);

//   if (sErr) throw sErr;

//   const waNumber = normalizePkPhone(phone);

//   const msg =
//     `Member Card (ID: ${memberId})\n` +
//     `PDF Link (24h): ${signed.signedUrl}\n\n` +
//     `Open and download.`;

//   // 4) open whatsapp chat with message prefilled
//   const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;
//   window.open(waUrl, "_blank", "noopener,noreferrer");
// }
