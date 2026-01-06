import { useEffect, useMemo, useRef, useState } from "react";
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

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

import { MemberCard } from "@/components/MemberCard";
import { downloadCardAsPdf, shareCardOnWhatsApp } from "@/lib/downloadCardPdf";

type Member = {
  id: string;
  member_no: number | null;
  full_name: string;
  phone: string;
  email: string | null;
  join_date: string; // YYYY-MM-DD
  monthly_fee: number;
  status: "active" | "inactive";
  notes?: string | null;
  photo_path: string | null;
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

// ---------- Date helpers ----------
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
  cycle_due_date: string;
  dueDateObj: Date;
  labelMonth: string;
  state: "paid" | "ok" | "due_soon" | "grace" | "overdue";
  stateLabel: string;
  payment?: Payment;
};

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

function feeBadge(state: Row["state"], label: string) {
  if (state === "paid")
    return (
      <Badge className="bg-green-600 text-white hover:bg-green-600">Paid</Badge>
    );
  if (state === "ok")
    return (
      <Badge className="bg-green-600 text-white hover:bg-green-600">
        {label}
      </Badge>
    );
  if (state === "due_soon")
    return (
      <Badge className="bg-yellow-400 text-black hover:bg-yellow-400">
        {label}
      </Badge>
    );
  if (state === "grace")
    return (
      <Badge className="bg-orange-500 text-white hover:bg-orange-500">
        {label}
      </Badge>
    );
  return (
    <Badge className="bg-red-600 text-white hover:bg-red-600">{label}</Badge>
  );
}

export default function MemberDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [member, setMember] = useState<Member | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingKey, setPayingKey] = useState<string | null>(null);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const phoneRegex = /^03\d{2}-\d{7}$/;

  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editJoinDate, setEditJoinDate] = useState("");
  const [editMonthlyFee, setEditMonthlyFee] = useState<number>(1500);
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");
  const [editNotes, setEditNotes] = useState("");

  // ✅ capture only the card (avoid capturing shadcn/tailwind parent)
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!member) return;

    setEditFullName(member.full_name ?? "");
    setEditPhone(member.phone ?? "");
    setEditEmail(member.email ?? "");
    setEditJoinDate(member.join_date ?? "");
    setEditMonthlyFee(Number(member.monthly_fee ?? 0));
    setEditStatus(member.status ?? "active");
    setEditNotes(member.notes ?? "");
  }, [member]);

  useEffect(() => {
    const run = async () => {
      if (!member?.photo_path) return setPhotoUrl(null);

      const { data, error } = await supabase.storage
        .from("member-photos")
        .createSignedUrl(member.photo_path, 60 * 60);

      if (error) return setPhotoUrl(null);
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
    return t >= d;
  }

  const fetchAll = async () => {
    if (!id) return;
    setLoading(true);

    const { data: m, error: mErr } = await supabase
      .from("members")
      .select(
        "id, member_no, full_name, phone, email, join_date, monthly_fee, status, notes, photo_path"
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const rows: Row[] = useMemo(() => {
    if (!member) return [];

    const today = new Date();
    const join = parseYMD(member.join_date);

    // first due = join date itself (your current behavior)
    let due = new Date(
      join.getFullYear(),
      join.getMonth(),
      join.getDate(),
      12,
      0,
      0
    );

    const payMap = new Map<string, Payment>();
    for (const p of payments) payMap.set(p.cycle_due_date, p);

    const full: Row[] = [];
    const end = addMonthsKeepDay(today, 1);

    let i = 0;
    const maxIterations = 240;

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

    return full.reverse();
  }, [member, payments]);

  const summary = useMemo(() => {
    const paid = rows.filter((r) => r.state === "paid").length;
    const unpaid = rows.filter((r) => r.state !== "paid").length;
    const overdue = rows.filter((r) => r.state === "overdue").length;
    const grace = rows.filter((r) => r.state === "grace").length;
    const dueSoon = rows.filter((r) => r.state === "due_soon").length;
    return { paid, unpaid, overdue, grace, dueSoon };
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

  const updateMember = async () => {
    if (!member) return;

    if (!editFullName.trim()) return alert("Name is required");
    if (!phoneRegex.test(editPhone))
      return alert("Phone must be like 0344-0208268");
    if (!editJoinDate) return alert("Join date is required");
    if (!editMonthlyFee || Number.isNaN(editMonthlyFee) || editMonthlyFee <= 0)
      return alert("Monthly fee must be valid");

    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from("members")
        .update({
          full_name: editFullName.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim() || null,
          join_date: editJoinDate,
          monthly_fee: Number(editMonthlyFee),
          status: editStatus,
          notes: editNotes.trim() || null,
        })
        .eq("id", member.id);

      if (error) throw error;

      setEditOpen(false);
      await fetchAll();
    } catch (e: any) {
      if (
        e?.code === "23505" ||
        String(e?.message ?? "").includes("uq_members_owner_phone")
      ) {
        alert("This phone number is already used by another member.");
      } else {
        alert(e?.message ?? "Failed to update member");
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteMember = async () => {
    if (!member) return;

    const ok = window.confirm(
      `Delete member "${member.full_name}"?\n\nThis will remove the member record.`
    );
    if (!ok) return;

    setDeleting(true);
    try {
      if (member.photo_path) {
        await supabase.storage
          .from("member-photos")
          .remove([member.photo_path]);
      }

      const { error } = await supabase
        .from("members")
        .delete()
        .eq("id", member.id);
      if (error) throw error;

      navigate("/");
    } catch (e: any) {
      alert(e?.message ?? "Failed to delete member");
    } finally {
      setDeleting(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;

    try {
      await shareCardOnWhatsApp(cardRef.current);
    } catch (err) {
      console.error(err);
      alert("Failed to share PDF");
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

  const cardMemberId = member.member_no ? String(member.member_no) : "—";

  return (
    <div className="p-6 space-y-6">
      {/* TOP BAR (clean actions) */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="text-2xl font-semibold">
            {member.full_name}{" "}
            <span className="text-muted-foreground text-base font-normal">
              (ID: {cardMemberId})
            </span>
          </div>
          <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
            <span>
              <span className="font-medium text-foreground">Phone:</span>{" "}
              {member.phone}
            </span>
            <span>
              <span className="font-medium text-foreground">Join:</span>{" "}
              {member.join_date}
            </span>
            <span>
              <span className="font-medium text-foreground">Fee:</span>{" "}
              {Number(member.monthly_fee).toFixed(0)}
            </span>
            <span>
              {member.status === "active" ? (
                <Badge>Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-end">
          {/* EDIT */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Edit</Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>Edit member</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Name *</Label>
                  <Input
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Phone *</Label>
                  <Input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="0344-0208268"
                  />
                  {!phoneRegex.test(editPhone) && editPhone.length > 0 && (
                    <p className="text-xs text-red-500">Format: 0344-0208268</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    type="email"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Join date *</Label>
                    <Input
                      value={editJoinDate}
                      onChange={(e) => setEditJoinDate(e.target.value)}
                      type="date"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Monthly fee *</Label>
                    <Input
                      value={editMonthlyFee}
                      onChange={(e) =>
                        setEditMonthlyFee(Number(e.target.value))
                      }
                      type="number"
                      min={0}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    value={editStatus}
                    onValueChange={(v) => setEditStatus(v as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="secondary"
                  onClick={() => setEditOpen(false)}
                  disabled={savingEdit}
                >
                  Cancel
                </Button>
                <Button onClick={updateMember} disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* DELETE */}
          <Button
            variant="destructive"
            onClick={deleteMember}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
          {/* <Card className="shadow-sm">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Member Card</CardTitle>
            </CardHeader>

            <CardContent className="text-sm text-muted-foreground">
              Click{" "}
              <span className="font-medium text-foreground">View Card</span> to
              open the member card preview and download it as PDF.
            </CardContent>
          </Card> */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">View Card</Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[760px]">
              <DialogHeader>
                <DialogTitle>Member Card Preview</DialogTitle>
              </DialogHeader>

              {/* Card preview area */}
              <div className="flex flex-col items-center gap-4">
                {/* white bg wrapper so pdf libs don't capture okclh/tailwind bg */}
                <div className="w-full rounded-xl border bg-white p-3 overflow-hidden">
                  {/* 👇 scale down ONLY for preview (PDF will still use original element size if your download uses this same ref) */}
                  <div
                    className="origin-top-left"
                    style={{
                      transform: "scale(0.78)", // adjust 0.7 - 0.9
                      width: "fit-content",
                    }}
                  >
                    <MemberCard
                      ref={cardRef}
                      gymName="Fitness Mania"
                      memberId={cardMemberId}
                      fullName={member.full_name}
                      phone={member.phone}
                      monthlyFee={member.monthly_fee}
                      photoUrl={photoUrl}
                    />
                  </div>
                </div>

                {/* actions */}
                <div className="flex flex-wrap items-center justify-end gap-2 w-full">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!cardRef.current) return;
                      await downloadCardAsPdf(
                        cardRef.current,
                        `member-${cardMemberId}-card.pdf`
                      );
                    }}
                  >
                    Download PDF
                  </Button>
                  <Button onClick={handleShare}>Share on WhatsApp</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* BACK */}
          <Button variant="outline" onClick={() => navigate("/")}>
            Back
          </Button>
        </div>
      </div>

      {/* MEMBER CARD IN MODAL */}

      {/* QUICK STATS */}
      <div className="grid gap-3 sm:grid-cols-5">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm">Paid months</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summary.paid}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm">Unpaid months</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summary.unpaid}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm">Due Soon</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summary.dueSoon}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm">Grace</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summary.grace}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm">Overdue</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summary.overdue}
          </CardContent>
        </Card>
      </div>

      {/* FEE HISTORY */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Fee history</CardTitle>
            <div className="text-sm text-muted-foreground">
              Latest months on top • Mark paid only on/after due date
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[110px]">Month</TableHead>
                  <TableHead className="w-[120px]">Due Date</TableHead>
                  <TableHead className="w-[170px]">Status</TableHead>
                  <TableHead className="text-right w-[120px]">Amount</TableHead>
                  <TableHead>Paid At</TableHead>
                  <TableHead className="text-right w-[140px]">Action</TableHead>
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
                  rows.map((r, idx) => (
                    <TableRow
                      key={r.cycle_due_date}
                      className={[
                        idx % 2 === 0 ? "bg-background" : "bg-muted/30",
                        "hover:bg-muted/60 transition-colors",
                      ].join(" ")}
                    >
                      <TableCell className="font-medium">
                        {r.labelMonth}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.cycle_due_date}
                      </TableCell>

                      <TableCell>{feeBadge(r.state, r.stateLabel)}</TableCell>

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
                              !isPayable(r.dueDateObj)
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
