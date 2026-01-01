import { useState } from "react";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  onCreated?: () => void; // refresh list callback
};

export default function AddMemberDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // required
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // optional + recommended
  const [email, setEmail] = useState("");
  const [joinDate, setJoinDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  ); // YYYY-MM-DD
  const [monthlyFee, setMonthlyFee] = useState<string>("0");
  const [notes, setNotes] = useState("");

  const reset = () => {
    setFullName("");
    setPhone("");
    setEmail("");
    setJoinDate(new Date().toISOString().slice(0, 10));
    setMonthlyFee("0");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // basic validation
    if (!fullName.trim()) return alert("Member name is required");
    if (!phone.trim()) return alert("Phone number is required");

    setLoading(true);
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;
      if (!user) throw new Error("Not logged in");

      const fee = Number(monthlyFee || 0);
      if (Number.isNaN(fee) || fee < 0)
        throw new Error("Monthly fee must be a valid number");

      const { error } = await supabase.from("members").insert({
        owner_id: user.id,
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        join_date: joinDate, // YYYY-MM-DD
        monthly_fee: fee,
        notes: notes.trim() || null,
        status: "active",
      });

      if (error) throw error;

      onCreated?.();
      reset();
      setOpen(false);
    } catch (err: any) {
      alert(err?.message ?? "Failed to create member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Member</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add new member</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Member name *</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ali Khan"
            />
          </div>

          <div className="grid gap-2">
            <Label>Phone number *</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 03xx-xxxxxxx"
            />
          </div>

          <div className="grid gap-2">
            <Label>Email (optional)</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. ali@gmail.com"
              type="email"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Join date</Label>
              <Input
                value={joinDate}
                onChange={(e) => setJoinDate(e.target.value)}
                type="date"
              />
            </div>

            <div className="grid gap-2">
              <Label>Monthly fee</Label>
              <Input
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(e.target.value)}
                type="number"
                min={0}
                step="0.01"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about member..."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
