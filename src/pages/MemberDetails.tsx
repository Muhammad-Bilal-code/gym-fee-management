import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Member = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  join_date: string; // YYYY-MM-DD
  monthly_fee: number;
  status: "active" | "inactive";
  photo_path: string | null; // ✅ add this
};

type Payment = {
  id: string;
  member_id: string;
  cycle_due_date: string; // YYYY-MM-DD
  amount: number;
  paid_at: string;
  method: string | null;
  note: string | null;
};

const GRACE_DAYS = 3;

// ---------- Date helpers (timezone-safe display + month-cycles) ----------
function daysInMonth(year: number, monthIndex0: number) {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}
function clampDay(year: number, monthIndex0: number, day: number) {
  return Math.min(day, daysInMonth(year, monthIndex0));
}
function addMonthsKeepDay(base: Date, months: number) {
  const y = base.getFullYear();
  const m = base.getMonth();
  const d = base.getDate();
  const targetMonth = m + months;

  const ny = y + Math.floor(targetMonth / 12);
  const nm = ((targetMonth % 12) + 12) % 12;
  const nd = clampDay(ny, nm, d);

  // keep midday to avoid timezone midnight flips
  return new Date(ny, nm, nd, 12, 0, 0);
}
function diffDays(a: Date, b: Date) {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((ua - ub) / (24 * 60 * 60 * 1000));
}
function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseYMD(s: string) {
  return new Date(s + "T12:00:00");
}

type Row = {
  cycle_due_date: string; // YYYY-MM-DD (key)
  dueDateObj: Date;
  labelMonth: string; // "2025-12"
  state: "paid" | "ok" | "due_soon" | "grace" | "overdue";
  stateLabel: string;
  payment?: Payment;
};

// Fee state for a cycle if NOT paid
function getCycleState(due: Date, today = new Date()) {
  const daysToDue = diffDays(due, today);

  if (daysToDue > GRACE_DAYS)
    return { key: "ok" as const, label: `Due in ${daysToDue}d` };
  if (daysToDue >= 0 && daysToDue <= GRACE_DAYS)
    return {
      key: "due_soon" as const,
      label: daysToDue === 0 ? "Due today" : `Due in ${daysToDue}d`,
    };

  const daysAfterDue = Math.abs(daysToDue);
  if (daysAfterDue <= GRACE_DAYS)
    return {
      key: "grace" as const,
      label: `Grace ${daysAfterDue}/${GRACE_DAYS}`,
    };

  return {
    key: "overdue" as const,
    label: `Overdue ${daysAfterDue - GRACE_DAYS}d`,
  };
}

export default function MemberDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [member, setMember] = useState<Member | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingKey, setPayingKey] = useState<string | null>(null);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!member?.photo_path) return setPhotoUrl(null);

      const { data, error } = await supabase.storage
        .from("member-photos")
        .createSignedUrl(member.photo_path, 60 * 60); // 1 hour

      if (error) {
        setPhotoUrl(null);
        return;
      }

      setPhotoUrl(data.signedUrl);
    };

    run();
  }, [member?.photo_path]);

  function isPayable(dueDate: Date) {
    const today = new Date();
    const t = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      12,
      0,
      0
    );
    const d = new Date(
      dueDate.getFullYear(),
      dueDate.getMonth(),
      dueDate.getDate(),
      12,
      0,
      0
    );

    return t >= d; // payable only if today >= due date
  }

  const fetchAll = async () => {
    if (!id) return;
    setLoading(true);

    const { data: m, error: mErr } = await supabase
      .from("members")
      .select(
        "id, full_name, phone, email, join_date, monthly_fee, status,photo_path"
      )
      .eq("id", id)
      .single();

    if (mErr) {
      console.error(mErr);
      setMember(null);
      setPayments([]);
      setLoading(false);
      return;
    }

    const { data: p, error: pErr } = await supabase
      .from("payments")
      .select("id, member_id, cycle_due_date, amount, paid_at, method, note")
      .eq("member_id", id)
      .order("cycle_due_date", { ascending: false });

    if (pErr) {
      console.error(pErr);
      setPayments([]);
    } else {
      setPayments((p ?? []) as Payment[]);
    }

    setMember(m as Member);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, [id]);

  const rows: Row[] = useMemo(() => {
    if (!member) return [];

    const today = new Date();
    const join = parseYMD(member.join_date);

    // rule: first due = join_date + 1 month
    let due = new Date(
      join.getFullYear(),
      join.getMonth(),
      join.getDate(),
      12,
      0,
      0
    );

    // build payments map by cycle_due_date
    const payMap = new Map<string, Payment>();
    for (const p of payments) payMap.set(p.cycle_due_date, p);

    // generate cycles until we cover current cycle + grace window
    const list: Row[] = [];
    const maxIterations = 240; // safety (20 years)
    let i = 0;

    while (i < maxIterations) {
      const key = fmtDate(due);
      const monthLabel = key.slice(0, 7); // YYYY-MM

      const paid = payMap.get(key);

      if (paid) {
        list.push({
          cycle_due_date: key,
          dueDateObj: due,
          labelMonth: monthLabel,
          state: "paid",
          stateLabel: "Paid",
          payment: paid,
        });
      } else {
        const st = getCycleState(due, today);
        list.push({
          cycle_due_date: key,
          dueDateObj: due,
          labelMonth: monthLabel,
          state: st.key,
          stateLabel: st.label,
        });
      }

      // stop condition: once due is sufficiently in the future (beyond "due soon" window)
      // we only need history up to next upcoming due (optional). If you want full future schedule, remove this.
      const daysToDue = diffDays(due, today);
      if (daysToDue > GRACE_DAYS) break;

      // move to next cycle
      due = addMonthsKeepDay(due, 1);
      i++;
    }

    // For full history: generate from first due up to current date cycle
    // The above stops early. Let's instead generate full history:
    // We'll rebuild properly: from first due until "today + 1 month" (for upcoming visibility)

    const full: Row[] = [];
    due = new Date(
      join.getFullYear(),
      join.getMonth(),
      join.getDate(),
      12,
      0,
      0
    );

    const end = addMonthsKeepDay(today, 1); // show up to one upcoming cycle
    i = 0;

    while (i < maxIterations && diffDays(due, end) <= 0) {
      const key = fmtDate(due);
      const monthLabel = key.slice(0, 7);
      const paid = payMap.get(key);

      if (paid) {
        full.push({
          cycle_due_date: key,
          dueDateObj: due,
          labelMonth: monthLabel,
          state: "paid",
          stateLabel: "Paid",
          payment: paid,
        });
      } else {
        const st = getCycleState(due, today);
        full.push({
          cycle_due_date: key,
          dueDateObj: due,
          labelMonth: monthLabel,
          state: st.key,
          stateLabel: st.label,
        });
      }

      due = addMonthsKeepDay(due, 1);
      i++;
    }

    // latest first
    return full.reverse();
  }, [member, payments]);

  const summary = useMemo(() => {
    const paid = rows.filter((r) => r.state === "paid").length;
    const unpaid = rows.filter((r) => r.state !== "paid").length;
    const overdue = rows.filter((r) => r.state === "overdue").length;
    const grace = rows.filter((r) => r.state === "grace").length;
    return { paid, unpaid, overdue, grace };
  }, [rows]);

  const markPaid = async (cycle_due_date: string) => {
    if (!member) return;
    setPayingKey(cycle_due_date);
    try {
      const { error } = await supabase.from("payments").insert({
        member_id: member.id,
        cycle_due_date,
        amount: member.monthly_fee,
        method: "cash",
        note: null,
      });

      if (error) throw error;

      await fetchAll();
    } catch (e: any) {
      alert(e?.message ?? "Failed to mark paid");
    } finally {
      setPayingKey(null);
    }
  };

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading member...</div>;
  }

  if (!member) {
    return (
      <div className="p-6 space-y-3">
        <div className="text-lg font-semibold">Member not found</div>
        <Button variant="outline" onClick={() => navigate("/")}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          {photoUrl ? (
            <img
              src={photoUrl}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-muted" />
          )}

          <div className="text-2xl font-semibold">{member.full_name}</div>
          <div className="text-sm text-muted-foreground">
            {member.phone} {member.email ? `• ${member.email}` : ""} • Join:{" "}
            <strong>{member.join_date}</strong>
          </div>
        </div>

        <Button variant="outline" onClick={() => navigate("/")}>
          Back
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Paid months</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summary.paid}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Unpaid months</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summary.unpaid}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Grace</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summary.grace}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Overdue</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summary.overdue}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fee history</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Paid At</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No cycles yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.cycle_due_date}>
                      <TableCell className="font-medium">
                        {r.labelMonth}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.cycle_due_date}
                      </TableCell>

                      <TableCell>
                        {r.state === "paid" && (
                          <Badge className="bg-green-600 text-white hover:bg-green-600">
                            Paid
                          </Badge>
                        )}
                        {r.state === "ok" && (
                          <Badge className="bg-green-600 text-white hover:bg-green-600">
                            {r.stateLabel}
                          </Badge>
                        )}
                        {r.state === "due_soon" && (
                          <Badge className="bg-yellow-400 text-black hover:bg-yellow-400">
                            {r.stateLabel}
                          </Badge>
                        )}
                        {r.state === "grace" && (
                          <Badge className="bg-orange-500 text-white hover:bg-orange-500">
                            {r.stateLabel}
                          </Badge>
                        )}
                        {r.state === "overdue" && (
                          <Badge className="bg-red-600 text-white hover:bg-red-600">
                            {r.stateLabel}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {r.payment
                          ? Number(r.payment.amount).toFixed(0)
                          : Number(member.monthly_fee).toFixed(0)}
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {r.payment
                          ? new Date(r.payment.paid_at).toLocaleString()
                          : "—"}
                      </TableCell>

                      <TableCell className="text-right">
                        {r.state !== "paid" ? (
                          <Button
                            size="sm"
                            onClick={() => markPaid(r.cycle_due_date)}
                            disabled={
                              payingKey === r.cycle_due_date ||
                              !isPayable(r.dueDateObj) // 👈 MAIN RULE
                            }
                            title={
                              !isPayable(r.dueDateObj)
                                ? "Payment can be marked only on or after due date"
                                : undefined
                            }
                          >
                            {payingKey === r.cycle_due_date
                              ? "Saving..."
                              : "Mark Paid"}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
