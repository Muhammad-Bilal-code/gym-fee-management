import React, { forwardRef } from "react";

type Props = {
  gymName: string;
  memberId: string; // member_no string
  fullName: string;
  phone: string;
  monthlyFee: number;
  photoUrl?: string | null;
};

export const MemberCard = forwardRef<HTMLDivElement, Props>(
  ({ gymName, memberId, fullName, phone, monthlyFee, photoUrl }, ref) => {
    return (
      <div
        ref={ref}
        data-pdf-card="member-card"
        // ✅ NO tailwind color classes here (oklch issue fix)
        style={{
          width: 360,
          height: 220,
          borderRadius: 16,
          border: "1px solid #E5E7EB",
          background: "#FFFFFF",
          overflow: "hidden",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial',
          color: "#111827",
          boxSizing: "border-box",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#0F172A",
            color: "#FFFFFF",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: 0.2 }}>
            {gymName}
          </div>

          <div
            style={{
              fontSize: 12,
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.22)",
              padding: "6px 10px",
              borderRadius: 999,
              fontWeight: 600,
            }}
          >
            ID: {memberId}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 16, display: "flex", gap: 14 }}>
          {/* Photo */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 14,
              border: "1px solid #E5E7EB",
              background: "#F3F4F6",
              overflow: "hidden",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6B7280",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={fullName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              "No Photo"
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                lineHeight: "20px",
                marginBottom: 6,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={fullName}
            >
              {fullName}
            </div>

            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 10 }}>
              Phone:{" "}
              <span style={{ color: "#111827", fontWeight: 700 }}>{phone}</span>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                  background: "#F8FAFC",
                  border: "1px solid #E5E7EB",
                  fontSize: 12,
                  color: "#111827",
                  fontWeight: 700,
                }}
              >
                Monthly Fee: {Number(monthlyFee).toFixed(0)}
              </div>

              <div
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                  background: "#F8FAFC",
                  border: "1px solid #E5E7EB",
                  fontSize: 12,
                  color: "#111827",
                  fontWeight: 700,
                }}
              >
                Card
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid #E5E7EB",
            background: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 11,
            color: "#6B7280",
          }}
        >
          <span>Keep this card safe</span>
          <span style={{ color: "#111827", fontWeight: 700 }}>Fitness</span>
        </div>
      </div>
    );
  }
);

MemberCard.displayName = "MemberCard";
