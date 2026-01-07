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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  photo_path: string | null;
};

type PaymentMini = {
  member_id: string;
  cycle_due_date: string; // YYYY-MM-DD
};

const GRACE_DAYS = 3;

/* =========================
   Date helpers (monthly cycles)
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

type FeeKey = "ok" | "due_soon" | "grace" | "overdue";
type FeeResult = {
  due: Date;
  key: FeeKey;
  label: string;
  unpaidCount: number;
};

function getFeeStatePaidAware(
  joinDate: string,
  paidSet: Set<string> | undefined
): FeeResult {
  const today = new Date();
  const join = parseYMD(joinDate);

  // first due is join date itself (as per your current logic)
  let due = new Date(
    join.getFullYear(),
    join.getMonth(),
    join.getDate(),
    12,
    0,
    0
  );

  const unpaidPast: Date[] = [];

  let safety = 0;
  while (diffDays(due, today) <= 0 && safety < 240) {
    const key = fmtDate(due);
    const isPaid = paidSet?.has(key) ?? false;
    if (!isPaid) unpaidPast.push(new Date(due));

    due = addMonthsKeepDay(due, 1);
    safety++;
  }

  if (unpaidPast.length > 0) {
    const firstMissed = unpaidPast[0];
    const daysToDue = diffDays(firstMissed, today);
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

  const [paidByMember, setPaidByMember] = useState<Map<string, Set<string>>>(
    new Map()
  );

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive" | "due_soon" | "overdue" | "grace"
  >("all");

  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Load signed urls for photos (private bucket)
  useEffect(() => {
    const loadPhotos = async () => {
      if (!members || members.length === 0) return;

      const updates: Record<string, string> = {};

      for (const m of members) {
        if (!m.photo_path) continue;
        if (photoUrls[m.photo_path]) continue;

        const { data, error } = await supabase.storage
          .from("member-photos")
          .createSignedUrl(m.photo_path, 60 * 60);

        if (!error && data?.signedUrl) {
          updates[m.photo_path] = data.signedUrl;
        }
      }

      if (Object.keys(updates).length > 0) {
        setPhotoUrls((prev) => ({ ...prev, ...updates }));
      }
    };

    loadPhotos();
  }, [members, photoUrls]);

  const fetchMembersAndPayments = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("members")
      .select(
        "id,member_no, full_name, phone, email, join_date, monthly_fee, status, created_at, photo_path"
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

        if (
          statusFilter === "overdue" ||
          statusFilter === "grace" ||
          statusFilter === "due_soon"
        ) {
          const paidSet = paidByMember.get(m.id);
          const fee = getFeeStatePaidAware(m.join_date, paidSet);
          return fee.key === statusFilter;
        }

        return true;
      })
      .filter((m) => {
        if (!q) return true;

        const memberNoStr = m.member_no?.toString() ?? "";
        const normalizedQuery = q.replace(/\D/g, "");
        const normalizedPhone = m.phone.replace(/\D/g, "");

        return (
          m.full_name.toLowerCase().includes(q) ||
          (normalizedQuery && memberNoStr.includes(normalizedQuery)) ||
          (normalizedQuery && normalizedPhone.includes(normalizedQuery))
        );
      });
  }, [members, query, statusFilter, paidByMember]);

  const feeCounts = useMemo(() => {
    let dueSoon = 0;
    let grace = 0;
    let overdue = 0;

    for (const m of members) {
      const paidSet = paidByMember.get(m.id);
      const fee = getFeeStatePaidAware(m.join_date, paidSet);

      if (fee.key === "due_soon") dueSoon++;
      else if (fee.key === "grace") grace++;
      else if (fee.key === "overdue") overdue++;
    }

    return { dueSoon, grace, overdue };
  }, [members, paidByMember]);

  const totalItems = filtered.length;
  const totalPages =
    pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));

  const paginatedMembers = useMemo(() => {
    if (pageSize === -1) return filtered;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filtered.slice(start, end);
  }, [filtered, page, pageSize]);

  // reset page when search/filter/pageSize changes
  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, pageSize]);

  // serial number start (for pagination)
  const serialStart = pageSize === -1 ? 0 : (page - 1) * pageSize;

  const [preview, setPreview] = useState<{
    name: string;
    url: string;
  } | null>(null);

  return (
    <div className="space-y-4">
      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-[92vw] sm:max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="text-base">{preview?.name}</DialogTitle>
          </DialogHeader>

          <div className="px-4 pb-4">
            {preview?.url && (
              <div className="flex justify-center">
                <img
                  src={preview.url}
                  alt={preview.name}
                  className="max-h-[75vh] w-auto rounded-lg object-contain"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, phone, member-id"
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
              variant={statusFilter === "due_soon" ? "default" : "outline"}
              onClick={() => setStatusFilter("due_soon")}
              size="sm"
              className="border-yellow-500 text-yellow-700 hover:bg-yellow-400 hover:text-black"
            >
              Due Soon
              {feeCounts.dueSoon > 0 && (
                <span className="ml-2 rounded-full bg-yellow-500 px-2 py-0.5 text-xs text-black">
                  {feeCounts.dueSoon}
                </span>
              )}
            </Button>

            <Button
              type="button"
              variant={statusFilter === "grace" ? "default" : "outline"}
              onClick={() => setStatusFilter("grace")}
              size="sm"
              className="border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white"
            >
              Grace
              {feeCounts.grace > 0 && (
                <span className="ml-2 rounded-full bg-orange-500 px-2 py-0.5 text-xs text-white">
                  {feeCounts.grace}
                </span>
              )}
            </Button>

            <Button
              type="button"
              variant={statusFilter === "overdue" ? "default" : "outline"}
              onClick={() => setStatusFilter("overdue")}
              size="sm"
              className="border-red-500 text-red-600 hover:bg-red-600 hover:text-white"
            >
              Overdue
              {feeCounts.overdue > 0 && (
                <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
                  {feeCounts.overdue}
                </span>
              )}
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

      {/* Pagination controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: page size */}
        <div className="flex items-center gap-2 text-sm">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded-md border px-2 py-1 bg-background"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={-1}>All</option>
          </select>
        </div>

        {/* Center: info */}
        <div className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-medium text-foreground">
            {totalItems === 0
              ? 0
              : pageSize === -1
              ? totalItems
              : Math.min(page * pageSize, totalItems)}
          </span>{" "}
          of <span className="font-medium text-foreground">{totalItems}</span>{" "}
          members
        </div>

        {/* Right: navigation */}
        {pageSize !== -1 && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>

            <span className="text-sm">
              Page {page} / {totalPages}
            </span>

            <Button
              size="sm"
              variant="outline"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[70px]">S#</TableHead>
              <TableHead className="w-[110px]">Member ID</TableHead>
              <TableHead className="w-[90px]">Profile</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-[150px]">Phone</TableHead>
              <TableHead className="w-[120px]">Join Date</TableHead>
              <TableHead className="w-[120px]">Due Date</TableHead>
              <TableHead className="text-right w-[120px]">
                Monthly Fee
              </TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[180px]">Fee Status</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="py-10 text-center text-muted-foreground"
                >
                  Loading members...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="py-10 text-center text-muted-foreground"
                >
                  No members found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedMembers.map((m, idx) => {
                const paidSet = paidByMember.get(m.id);
                const fee = getFeeStatePaidAware(m.join_date, paidSet);

                const serialNo = serialStart + idx + 1;

                return (
                  <TableRow
                    key={m.id}
                    className={[
                      "cursor-pointer transition-colors",
                      idx % 2 === 0 ? "bg-background" : "bg-muted/30",
                      "hover:bg-muted/60",
                    ].join(" ")}
                    onClick={() => navigate(`/members/${m.id}`)}
                  >
                    {/* Serial */}
                    <TableCell className="text-muted-foreground font-medium">
                      {serialNo}
                    </TableCell>

                    {/* Member ID */}
                    <TableCell className="text-muted-foreground">
                      {m.member_no ?? "—"}
                    </TableCell>

                    {/* Profile */}
                    {/* Profile */}
                    <TableCell>
                      {(() => {
                        const path = m.photo_path ?? undefined;
                        const url = path ? photoUrls[path] : undefined;

                        if (!url) {
                          return (
                            <span className="text-xs text-muted-foreground">
                              N/A
                            </span>
                          );
                        }

                        return (
                          <img
                            src={url}
                            alt={m.full_name}
                            className="h-10 w-10 rounded-full object-cover border cursor-zoom-in"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreview({ name: m.full_name, url });
                            }}
                          />
                        );
                      })()}
                    </TableCell>

                    {/* <TableCell>
                      {m.photo_path && photoUrls[m.photo_path] ? (
                        <img
                          src={photoUrls[m.photo_path]}
                          alt={m.full_name}
                          className="h-10 w-10 rounded-full object-cover border"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          N/A
                        </span>
                      )}
                    </TableCell> */}

                    {/* Name */}
                    <TableCell className="font-medium">{m.full_name}</TableCell>

                    {/* Phone */}
                    <TableCell>{m.phone}</TableCell>

                    {/* Join Date */}
                    <TableCell>{m.join_date}</TableCell>
                    {/* Due Date */}
                    <TableCell className="text-muted-foreground">
                      {fmtDate(fee.due)}
                    </TableCell>

                    {/* Monthly Fee */}
                    <TableCell className="text-right">
                      {Number(m.monthly_fee).toFixed(0)}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {m.status === "active" ? (
                        <Badge>Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>

                    {/* Fee Status */}
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
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
