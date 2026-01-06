import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AddMemberDialog from "@/components/AddMemberDialog";
import MembersTable from "@/components/MembersTable";

type Member = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  join_date: string;
  monthly_fee: number;
  status: "active" | "inactive";
};

export default function Dashboard() {
  const [_, setMembers] = useState<Member[]>([]);
  const [__, setLoading] = useState(true);

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("members")
      .select("id, full_name, phone, email, join_date, monthly_fee, status")
      .order("created_at", { ascending: false });

    if (!error) setMembers((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Members</h2>
        <AddMemberDialog onCreated={fetchMembers} />
      </div>

      <MembersTable />
    </div>
  );
}
