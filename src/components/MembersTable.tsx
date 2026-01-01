import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  member_no: number | null;
  full_name: string;
  phone: string;
  email: string | null;
  join_date: string; // YYYY-MM-DD
  monthly_fee: number;
  status: "active" | "inactive";
  created_at: string;
};

type PaymentMini = {
  member_id: string;
  cycle_due_date: string; // YYYY-MM-DD
};

const GRACE_DAYS = 3;

/* =========================
   Date helpers (monthly cycles)
   Rule: first due = join_date + 1 month
   ========================= */
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

  // midday avoids timezone midnight flips
  return new Date(ny, nm, nd, 12, 0, 0);
}

function diffDays(a: Date, b: Date) {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((ua - ub) / (24 * 60 * 60 * 1000));
}

function fmtDate(d: Date) {
  // local safe YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYMD(s: string) {
  return new Date(s + "T12:00:00");
}

type FeeKey = "ok" | "due_soon" | "grace" | "overdue";
type FeeResult = {
  due: Date;
  key: FeeKey;
  label: string;
  unpaidCount: number; // missed cycles count (<= today)
};

/**
 * Paid-aware fee state:
 * - Build cycles from first due (join+1 month) up to today
 * - Find UNPAID cycles (due <= today not in payments)
 *   - If any unpaid: show earliest unpaid => grace/overdue status
 *   - If none unpaid: show next due cycle => ok/due_soon
 */
function getFeeStatePaidAware(
  joinDate: string,
  paidSet: Set<string> | undefined
): FeeResult {
  const today = new Date();
  const join = parseYMD(joinDate);

  // ✅ first due is the join date itself
  let due = new Date(
    join.getFullYear(),
    join.getMonth(),
    join.getDate(),
    12,
    0,
    0
  );

  const unpaidPast: Date[] = [];

  // generate cycles until due > today (past cycles only)
  let safety = 0;
  while (diffDays(due, today) <= 0 && safety < 240) {
    const key = fmtDate(due);
    const isPaid = paidSet?.has(key) ?? false;
    if (!isPaid) unpaidPast.push(new Date(due));

    due = addMonthsKeepDay(due, 1); // next month same day
    safety++;
  }

  // if missed any past cycle, show earliest missed cycle
  if (unpaidPast.length > 0) {
    const firstMissed = unpaidPast[0]; // earliest unpaid => most overdue
    const daysToDue = diffDays(firstMissed, today); // negative
    const daysAfterDue = Math.abs(daysToDue);

    if (daysAfterDue <= GRACE_DAYS) {
      return {
        due: firstMissed,
        key: "grace",
        label: `Grace ${daysAfterDue}/${GRACE_DAYS}${
          unpaidPast.length > 1 ? ` • ${unpaidPast.length} unpaid` : ""
        }`,
        unpaidCount: unpaidPast.length,
      };
    }

    return {
      due: firstMissed,
      key: "overdue",
      label: `Overdue ${daysAfterDue - GRACE_DAYS}d${
        unpaidPast.length > 1 ? ` • ${unpaidPast.length} unpaid` : ""
      }`,
      unpaidCount: unpaidPast.length,
    };
  }

  // otherwise show upcoming due (due currently is the first cycle after today)
  const daysToNext = diffDays(due, today);

  if (daysToNext <= GRACE_DAYS) {
    return {
      due,
      key: "due_soon",
      label: daysToNext === 0 ? "Due today" : `Due in ${daysToNext}d`,
      unpaidCount: 0,
    };
  }

  return {
    due,
    key: "ok",
    label: `Due in ${daysToNext}d`,
    unpaidCount: 0,
  };
}

export default function MembersTable() {
  const navigate = useNavigate();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // payments map: member_id -> set of paid cycle_due_date (YYYY-MM-DD)
  const [paidByMember, setPaidByMember] = useState<Map<string, Set<string>>>(
    new Map()
  );

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive" | "overdue" | "grace"
  >("all");

  const fetchMembersAndPayments = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("members")
      .select(
        "id,member_no, full_name, phone, email, join_date, monthly_fee, status, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMembers([]);
      setPaidByMember(new Map());
      setLoading(false);
      return;
    }

    const mems = (data ?? []) as Member[];
    setMembers(mems);

    // fetch payments for these members
    if (mems.length === 0) {
      setPaidByMember(new Map());
      setLoading(false);
      return;
    }

    const memberIds = mems.map((m) => m.id);

    const { data: pData, error: pErr } = await supabase
      .from("payments")
      .select("member_id, cycle_due_date")
      .in("member_id", memberIds);

    if (pErr) {
      console.error(pErr);
      setPaidByMember(new Map());
      setLoading(false);
      return;
    }

    const map = new Map<string, Set<string>>();
    (pData ?? []).forEach((p) => {
      const pm = p as PaymentMini;
      if (!map.has(pm.member_id)) map.set(pm.member_id, new Set());
      map.get(pm.member_id)!.add(pm.cycle_due_date);
    });

    setPaidByMember(map);
    setLoading(false);
  };

  useEffect(() => {
    fetchMembersAndPayments();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return members
      .filter((m) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "active") return m.status === "active";
        if (statusFilter === "inactive") return m.status === "inactive";

        // fee overdue filter (paid-aware)
        if (statusFilter === "overdue" || statusFilter === "grace") {
          const paidSet = paidByMember.get(m.id);
          const fee = getFeeStatePaidAware(m.join_date, paidSet);
          return fee.key === statusFilter; // "overdue" OR "grace"
        }

        return true;
      })
      .filter((m) => {
        if (!q) return true;

        const memberNoStr = m.member_no?.toString() ?? "";
        const normalizedQuery = q.replace(/[^0-9]/g, ""); // keep digits only

        return (
          m.full_name.toLowerCase().includes(q) ||
          (normalizedQuery && memberNoStr.includes(normalizedQuery))
        );
      });
  }, [members, query, statusFilter, paidByMember]);

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, phone, email..."
            className="sm:w-[320px]"
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={statusFilter === "all" ? "default" : "outline"}
              onClick={() => setStatusFilter("all")}
              size="sm"
            >
              All
            </Button>
            <Button
              type="button"
              variant={statusFilter === "active" ? "default" : "outline"}
              onClick={() => setStatusFilter("active")}
              size="sm"
            >
              Active
            </Button>
            <Button
              type="button"
              variant={statusFilter === "inactive" ? "default" : "outline"}
              onClick={() => setStatusFilter("inactive")}
              size="sm"
            >
              Inactive
            </Button>

            <Button
              type="button"
              variant={statusFilter === "overdue" ? "default" : "outline"}
              onClick={() => setStatusFilter("overdue")}
              size="sm"
              className="border-red-500 text-red-600 hover:bg-red-600 hover:text-white"
            >
              Overdue
            </Button>
            <Button
              type="button"
              variant={statusFilter === "grace" ? "default" : "outline"}
              onClick={() => setStatusFilter("grace")}
              size="sm"
              className="border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white"
            >
              Grace
            </Button>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={fetchMembersAndPayments}
          disabled={loading}
          size="sm"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">#</TableHead>

              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Join Date</TableHead>
              <TableHead className="text-right">Monthly Fee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fee Status</TableHead>
              <TableHead>Due Date</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-muted-foreground"
                >
                  Loading members...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-muted-foreground"
                >
                  No members found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((m) => {
                const paidSet = paidByMember.get(m.id);
                const fee = getFeeStatePaidAware(m.join_date, paidSet);

                return (
                  <TableRow
                    key={m.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/members/${m.id}`)}
                  >
                    <TableCell className="text-muted-foreground">
                      {m.member_no ?? "—"}
                    </TableCell>

                    <TableCell className="font-medium">{m.full_name}</TableCell>
                    <TableCell>{m.phone}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.email ?? "—"}
                    </TableCell>
                    <TableCell>{m.join_date}</TableCell>

                    <TableCell className="text-right">
                      {Number(m.monthly_fee).toFixed(0)}
                    </TableCell>

                    <TableCell>
                      {m.status === "active" ? (
                        <Badge>Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>

                    {/* Paid-aware Fee Status */}
                    <TableCell>
                      {fee.key === "ok" && (
                        <Badge className="bg-green-600 text-white hover:bg-green-600">
                          {fee.label}
                        </Badge>
                      )}
                      {fee.key === "due_soon" && (
                        <Badge className="bg-yellow-400 text-black hover:bg-yellow-400">
                          {fee.label}
                        </Badge>
                      )}
                      {fee.key === "grace" && (
                        <Badge className="bg-orange-500 text-white hover:bg-orange-500">
                          {fee.label}
                        </Badge>
                      )}
                      {fee.key === "overdue" && (
                        <Badge className="bg-red-600 text-white hover:bg-red-600">
                          {fee.label}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {fmtDate(fee.due)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && (
        <div className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-medium text-foreground">{filtered.length}</span>{" "}
          of{" "}
          <span className="font-medium text-foreground">{members.length}</span>{" "}
          members
        </div>
      )}
    </div>
  );
}
