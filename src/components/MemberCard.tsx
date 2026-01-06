// import React, { forwardRef } from "react";

// type Props = {
//   gymName: string;
//   memberId: string; // member_no string
//   fullName: string;
//   phone: string;
//   monthlyFee: number;
//   photoUrl?: string | null;
// };

// export const MemberCard = forwardRef<HTMLDivElement, Props>(
//   ({ gymName, memberId, fullName, phone, monthlyFee, photoUrl }, ref) => {
//     return (
//       <div
//         ref={ref}
//         data-pdf-card="member-card"
//         // ✅ NO tailwind color classes here (oklch issue fix)
//         style={{
//           width: 700,
//           height: 350,
//           borderRadius: 16,
//           border: "1px solid #E5E7EB",
//           background: "#FFFFFF",
//           overflow: "hidden",
//           fontFamily:
//             'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial',
//           color: "#111827",
//           boxSizing: "border-box",
//         }}
//       >
//         {/* Top bar */}
//         <div
//           style={{
//             padding: "14px 16px",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "space-between",
//             background: "#0F172A",
//             color: "#FFFFFF",
//           }}
//         >
//           <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: 0.2 }}>
//             {gymName}
//           </div>

//           <div
//             style={{
//               fontSize: 20,
//               background: "rgba(255,255,255,0.14)",
//               border: "1px solid rgba(255,255,255,0.22)",
//               padding: "6px 10px",
//               borderRadius: 999,
//               fontWeight: 600,
//             }}
//           >
//             ID: {memberId}
//           </div>
//         </div>

//         {/* Body */}
//         <div style={{ padding: 16, display: "flex", gap: 14 }}>
//           {/* Photo */}
//           <div
//             style={{
//               width: 200,
//               height: 200,
//               borderRadius: 14,
//               border: "1px solid #E5E7EB",
//               background: "#F3F4F6",
//               overflow: "hidden",
//               flexShrink: 0,
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               color: "#6B7280",
//               fontSize: 12,
//               fontWeight: 600,
//             }}
//           >
//             {photoUrl ? (
//               <img
//                 src={photoUrl}
//                 alt={fullName}
//                 style={{ width: "100%", height: "100%", objectFit: "cover" }}
//               />
//             ) : (
//               "No Photo"
//             )}
//           </div>

//           {/* Info */}
//           <div style={{ flex: 1, minWidth: 0 }}>
//             <div
//               style={{
//                 fontSize: 26,
//                 fontWeight: 800,
//                 lineHeight: "20px",
//                 marginBottom: 6,
//                 whiteSpace: "nowrap",
//                 overflow: "hidden",
//                 textOverflow: "ellipsis",
//               }}
//               title={fullName}
//             >
//               {fullName}
//             </div>

//             <div style={{ fontSize: 20, color: "#6B7280", marginBottom: 10 }}>
//               Phone:{" "}
//               <span style={{ color: "#111827", fontWeight: 700 }}>{phone}</span>
//             </div>

//             <div
//               style={{
//                 display: "flex",
//                 gap: 10,
//                 alignItems: "center",
//                 flexWrap: "wrap",
//               }}
//             >
//               <div
//                 style={{
//                   padding: "8px 10px",
//                   borderRadius: 12,
//                   background: "#F8FAFC",
//                   border: "1px solid #E5E7EB",
//                   fontSize: 20,
//                   color: "#111827",
//                   fontWeight: 700,
//                 }}
//               >
//                 Monthly Fee: {Number(monthlyFee).toFixed(0)}
//               </div>

//               <div
//                 style={{
//                   padding: "8px 10px",
//                   borderRadius: 12,
//                   background: "#F8FAFC",
//                   border: "1px solid #E5E7EB",
//                   fontSize: 20,
//                   color: "#111827",
//                   fontWeight: 700,
//                 }}
//               >
//                 Card
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Footer */}
//         <div
//           style={{
//             padding: "10px 16px",
//             borderTop: "1px solid #E5E7EB",
//             background: "#FFFFFF",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "space-between",
//             fontSize: 20,
//             color: "#6B7280",
//           }}
//         >
//           <span>Keep this card safe</span>
//           <span style={{ color: "#111827", fontWeight: 700 }}>Fitness</span>
//         </div>
//       </div>
//     );
//   }
// );

// MemberCard.displayName = "MemberCard";

import React, { forwardRef, useMemo } from "react";

type Props = {
  gymName: string;
  memberId: string; // member_no string
  fullName: string;
  phone: string;
  monthlyFee: number;
  photoUrl?: string | null;
};

function formatPKR(n: number) {
  const num = Number.isFinite(n) ? n : 0;
  return `Rs ${Math.round(num).toLocaleString("en-PK")}`;
}

function safeInitials(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "M";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

export const MemberCard = forwardRef<HTMLDivElement, Props>(
  ({ gymName, memberId, fullName, phone, monthlyFee, photoUrl }, ref) => {
    const initials = useMemo(() => safeInitials(fullName), [fullName]);

    return (
      <div
        ref={ref}
        data-pdf-card="member-card"
        style={{
          width: 700,
          // height: 350,
          borderRadius: 18,
          background: "#FFFFFF",
          overflow: "hidden",
          boxSizing: "border-box",
          position: "relative",
          border: "1px solid rgba(15, 23, 42, 0.10)",
          boxShadow:
            "0 14px 40px rgba(15, 23, 42, 0.12), 0 2px 10px rgba(15, 23, 42, 0.08)",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial',
          color: "#0F172A",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            position: "relative",
            height: 96,
            padding: "16px 18px",
            boxSizing: "border-box",
            background:
              "linear-gradient(135deg, #0B1220 0%, #0F1C3B 42%, #142B5E 100%)",
            color: "#FFFFFF",
            overflow: "hidden",
          }}
        >
          {/* subtle pattern */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 40%), radial-gradient(circle at 85% 35%, rgba(56,189,248,0.16) 0%, rgba(56,189,248,0) 45%), radial-gradient(circle at 70% 120%, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0) 55%)",
              opacity: 0.9,
            }}
          />
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: 0.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={gymName}
              >
                {gymName}
              </div>
              <div
                style={{
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.80)",
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.22)",
                    background: "rgba(255,255,255,0.10)",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 99,
                      background: "#22C55E",
                      boxShadow: "0 0 0 3px rgba(34,197,94,0.18)",
                      display: "inline-block",
                    }}
                  />
                  Active Member Card
                </span>
              </div>
            </div>

            {/* ID Badge */}
            <div
              style={{
                position: "relative",
                flexShrink: 0,
                padding: "10px 14px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.22)",
                background: "rgba(255,255,255,0.10)",
                backdropFilter: "blur(6px)",
                textAlign: "right",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.75)",
                  letterSpacing: 0.6,
                }}
              >
                MEMBER ID
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, marginTop: 2 }}>
                {memberId}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            padding: 18,
            display: "flex",
            gap: 16,
            boxSizing: "border-box",
          }}
        >
          {/* Photo + frame */}
          <div style={{ width: 210, flexShrink: 0 }}>
            <div
              style={{
                width: 210,
                height: 210,
                borderRadius: 18,
                padding: 10,
                boxSizing: "border-box",
                background:
                  "linear-gradient(145deg, rgba(15,23,42,0.06), rgba(15,23,42,0.02))",
                border: "1px solid rgba(15,23,42,0.10)",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 14,
                  overflow: "hidden",
                  position: "relative",
                  background: "#F1F5F9",
                  border: "1px solid rgba(15,23,42,0.10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={fullName}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "column",
                      gap: 10,
                      color: "#475569",
                    }}
                  >
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 999,
                        background:
                          "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#FFFFFF",
                        fontWeight: 900,
                        fontSize: 22,
                        letterSpacing: 0.4,
                        boxShadow: "0 10px 20px rgba(15,23,42,0.18)",
                      }}
                    >
                      {initials}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>
                      No Photo
                    </div>
                  </div>
                )}

                {/* corner accent */}
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    right: 10,
                    bottom: 10,
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background:
                      "linear-gradient(135deg, rgba(56,189,248,0.25), rgba(34,197,94,0.18))",
                    border: "1px solid rgba(15,23,42,0.08)",
                  }}
                />
              </div>
            </div>

            {/* tiny note */}
            {/* <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: "#64748B",
                fontWeight: 700,
                letterSpacing: 0.2,
              }}
            >
              Keep this card safe
            </div> */}
          </div>

          {/* Info column */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Name */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 950,
                    lineHeight: "34px",
                    letterSpacing: -0.2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={fullName}
                >
                  {fullName}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    color: "#334155",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 12,
                      background: "#F8FAFC",
                      border: "1px solid rgba(15,23,42,0.08)",
                    }}
                  >
                    <span style={{ color: "#64748B", fontWeight: 800 }}>
                      Phone
                    </span>
                    <span style={{ color: "#0F172A", fontWeight: 900 }}>
                      {phone}
                    </span>
                  </span>

                  {/* <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 12,
                      background: "#F8FAFC",
                      border: "1px solid rgba(15,23,42,0.08)",
                    }}
                  >
                    <span style={{ color: "#64748B", fontWeight: 800 }}>
                      Plan
                    </span>
                    <span style={{ color: "#0F172A", fontWeight: 900 }}>
                      Monthly
                    </span>
                  </span> */}
                </div>
              </div>

              {/* Fee highlight */}
              <div
                style={{
                  flexShrink: 0,
                  padding: "10px 12px",
                  borderRadius: 16,
                  background:
                    "linear-gradient(135deg, rgba(34,197,94,0.16), rgba(56,189,248,0.14))",
                  border: "1px solid rgba(15,23,42,0.10)",
                  boxShadow: "0 10px 18px rgba(15,23,42,0.10)",
                  textAlign: "right",
                  minWidth: 170,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: 0.7,
                    color: "#334155",
                    textTransform: "uppercase",
                  }}
                >
                  Monthly Fee
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 22,
                    fontWeight: 950,
                    color: "#0F172A",
                  }}
                >
                  {formatPKR(monthlyFee)}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div
              style={{
                marginTop: 16,
                height: 1,
                background:
                  "linear-gradient(90deg, rgba(15,23,42,0.08), rgba(15,23,42,0.02))",
              }}
            />

            {/* Bottom row */}
            {/* <div
              style={{
                marginTop: 16,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
             
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    borderRadius: 999,
                    background: "#0F172A",
                    color: "#FFFFFF",
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: 0.3,
                  }}
                >
                  ✅ Verified Member
                </span>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    borderRadius: 999,
                    background: "#F8FAFC",
                    border: "1px solid rgba(15,23,42,0.10)",
                    color: "#0F172A",
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: 0.3,
                  }}
                >
                  🏋️ Access Allowed
                </span>
              </div>

              
              <div
                style={{
                  width: 78,
                  height: 78,
                  borderRadius: 14,
                  background: "#FFFFFF",
                  border: "1px dashed rgba(15,23,42,0.22)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748B",
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: 0.6,
                  textAlign: "center",
                  padding: 8,
                  boxSizing: "border-box",
                }}
                title="Optional: QR code can be added later"
              >
                QR
                <br />
                CODE
              </div>
            </div> */}
          </div>
        </div>

        <div>
          <h2
            style={{
              textAlign: "center",
              marginBottom: "5px",
              fontWeight: "bold",
            }}
          >
            Keep this card safe and secure
          </h2>
        </div>
      </div>
    );
  }
);

MemberCard.displayName = "MemberCard";
