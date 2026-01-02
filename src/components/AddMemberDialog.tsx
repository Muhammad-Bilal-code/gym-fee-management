// import { useEffect, useState } from "react";
// import { supabase } from "@/lib/supabase";

// import { Button } from "@/components/ui/button";
// import {
//   Dialog,
//   DialogContent,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { InputMask } from "@react-input/mask";

// type Props = {
//   onCreated?: () => void; // refresh list callback
// };

// function formatPkMobile(input: string) {
//   const digits = input.replace(/\D/g, "").slice(0, 11); // 11 digits max

//   // start must be 03...
//   let d = digits;
//   if (d.length >= 1 && d[0] !== "0") d = "0" + d.slice(0, 10);
//   if (d.length >= 2 && d[1] !== "3") {
//     // if user typed something else, keep but still format
//   }

//   if (d.length <= 4) return d;
//   return `${d.slice(0, 4)}-${d.slice(4)}`; // 0344-0208268
// }

// export default function AddMemberDialog({ onCreated }: Props) {
//   const [open, setOpen] = useState(false);
//   const [loading, setLoading] = useState(false);

//   // required
//   const [fullName, setFullName] = useState("");
//   const [phone, setPhone] = useState("");

//   // optional + recommended
//   const [email, setEmail] = useState("");
//   const [joinDate, setJoinDate] = useState(() =>
//     new Date().toISOString().slice(0, 10)
//   ); // YYYY-MM-DD
//   const [notes, setNotes] = useState("");

//   const DEFAULT_FEE = 1500;

//   const [monthlyFee, setMonthlyFee] = useState<number>(DEFAULT_FEE);

//   const [photoFile, setPhotoFile] = useState<File | null>(null);
//   const [photoPreview, setPhotoPreview] = useState<string | null>(null);

//   useEffect(() => {
//     if (!photoFile) {
//       setPhotoPreview(null);
//       return;
//     }

//     const url = URL.createObjectURL(photoFile);
//     setPhotoPreview(url);

//     return () => URL.revokeObjectURL(url);
//   }, [photoFile]);

//   const reset = () => {
//     setFullName("");
//     setPhone("");
//     setEmail("");
//     setJoinDate(new Date().toISOString().slice(0, 10));
//     setMonthlyFee(1500);
//     setNotes("");
//     setPhotoFile(null);
//     setPhotoPreview(null);
//   };
//   const phoneRegex = /^03\d{2}-\d{7}$/;
//   const isFormValid =
//     fullName.trim().length > 0 && phoneRegex.test(phone) && !!photoFile;

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);

//     if (!fullName.trim()) return alert("Name is required");
//     if (!phone.trim()) return alert("Phone number is required");

//     if (!phoneRegex.test(phone)) {
//       return alert("Phone number must be like 0344-0208268");
//     }

//     if (!photoFile) return alert("Profile photo is required");

//     if (!photoFile.type.startsWith("image/")) {
//       return alert("Only image files are allowed");
//     }
//     if (photoFile.size > 2 * 1024 * 1024) {
//       return alert("Max photo size is 2MB");
//     }

//     try {
//       const {
//         data: { user },
//         error: userErr,
//       } = await supabase.auth.getUser();
//       if (userErr) throw userErr;
//       if (!user) throw new Error("Owner not logged in");

//       // 1) Create member
//       const { data: member, error: insErr } = await supabase
//         .from("members")
//         .insert({
//           owner_id: user.id,
//           full_name: fullName.trim(),
//           phone: phone.trim(),
//           email: email.trim() || null,
//           join_date: joinDate,
//           monthly_fee: Number(monthlyFee || 0),
//           notes: notes.trim() || null,
//           status: "active",
//         })
//         .select("id")
//         .single();

//       if (insErr) throw insErr;

//       // 2) Upload photo (private bucket)
//       if (photoFile) {
//         const ext = photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
//         const fileName = `${member.id}-${Date.now()}.${ext}`;
//         const path = `${user.id}/members/${fileName}`; // ✅ owner folder

//         const { error: upErr } = await supabase.storage
//           .from("member-photos")
//           .upload(path, photoFile, {
//             upsert: true,
//             contentType: photoFile.type,
//           });

//         if (upErr) throw upErr;

//         // 3) Save path in DB
//         const { error: updErr } = await supabase
//           .from("members")
//           .update({ photo_path: path })
//           .eq("id", member.id);

//         if (updErr) throw updErr;
//       }

//       // done
//       onCreated?.();
//       reset();
//       setPhotoFile(null);
//       setOpen(false);
//     } catch (err: any) {
//       alert(err?.message ?? "Failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Dialog open={open} onOpenChange={setOpen}>
//       <DialogTrigger asChild>
//         <Button>Add Member</Button>
//       </DialogTrigger>

//       <DialogContent className="sm:max-w-[520px]">
//         <DialogHeader>
//           <DialogTitle>Add new member</DialogTitle>
//         </DialogHeader>

//         <form onSubmit={handleSubmit} className="grid gap-4">
//           <div className="grid gap-2">
//             <Label>Profile photo *</Label>

//             <Input
//               type="file"
//               accept="image/*"
//               required
//               onChange={(e) => {
//                 const file = e.target.files?.[0] ?? null;
//                 setPhotoFile(file);
//               }}
//             />

//             {photoPreview ? (
//               <div className="flex items-center gap-3">
//                 <img
//                   src={photoPreview}
//                   alt="Selected photo preview"
//                   className="h-16 w-16 rounded-full object-cover border"
//                 />
//                 <div className="text-sm">
//                   <div className="font-medium">{photoFile?.name}</div>
//                   <div className="text-muted-foreground">
//                     {photoFile?.size ? (photoFile.size / 1024).toFixed(0) : "0"}{" "}
//                     KB
//                   </div>
//                 </div>
//               </div>
//             ) : (
//               <div className="text-xs text-muted-foreground">
//                 Select an image to preview
//               </div>
//             )}
//           </div>

//           <div className="grid gap-2">
//             <Label>Member name *</Label>
//             <Input
//               value={fullName}
//               onChange={(e) => setFullName(e.target.value)}
//               placeholder="e.g. Ali Khan"
//               required
//             />
//           </div>

//           <div className="grid gap-2">
//             <Label>Phone *</Label>

//             <Input
//               value={phone}
//               onChange={(e) => setPhone(formatPkMobile(e.target.value))}
//               placeholder="0344-0208268"
//               inputMode="numeric"
//               required
//               maxLength={12} // 11 digits + dash = 12
//             />
//           </div>

//           <div className="grid gap-2">
//             <Label>Email (optional)</Label>
//             <Input
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               placeholder="e.g. ali@gmail.com"
//               type="email"
//             />
//           </div>

//           <div className="grid grid-cols-2 gap-3">
//             <div className="grid gap-2">
//               <Label>Join date</Label>
//               <Input
//                 value={joinDate}
//                 onChange={(e) => setJoinDate(e.target.value)}
//                 type="date"
//               />
//             </div>

//             <div className="grid gap-2">
//               <Label>Monthly fee</Label>
//               <Input
//                 value={monthlyFee}
//                 onChange={(e) => setMonthlyFee(Number(e.target.value))}
//                 type="number"
//                 min={0}
//                 step="0.01"
//                 required
//               />
//             </div>
//           </div>

//           <div className="grid gap-2">
//             <Label>Notes (optional)</Label>
//             <Textarea
//               value={notes}
//               onChange={(e) => setNotes(e.target.value)}
//               placeholder="Any notes about member..."
//             />
//           </div>

//           <DialogFooter>
//             <Button
//               type="button"
//               variant="secondary"
//               onClick={() => setOpen(false)}
//               disabled={loading}
//             >
//               Cancel
//             </Button>
//             <Button type="submit" disabled={loading || !isFormValid}>
//               {loading ? "Saving..." : "Create Member"}
//             </Button>
//           </DialogFooter>
//         </form>
//       </DialogContent>
//     </Dialog>
//   );
// }

import { useEffect, useMemo, useState } from "react";
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

const DEFAULT_FEE = 1500;
const phoneRegex = /^03\d{2}-\d{7}$/;

function formatPkMobile(input: string) {
  const digits = input.replace(/\D/g, "").slice(0, 11); // 11 digits max
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`; // 0344-0208268
}

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
  const [notes, setNotes] = useState("");

  // default
  const [monthlyFee, setMonthlyFee] = useState<number>(DEFAULT_FEE);

  // photo (required)
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [fileInputKey, setFileInputKey] = useState(0);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }

    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const isFormValid = useMemo(() => {
    return (
      fullName.trim().length > 0 &&
      phoneRegex.test(phone) &&
      photoFile !== null &&
      monthlyFee > 0
    );
  }, [fullName, phone, photoFile, monthlyFee]);

  const reset = () => {
    setFullName("");
    setPhone("");
    setEmail("");
    setJoinDate(new Date().toISOString().slice(0, 10));
    setMonthlyFee(DEFAULT_FEE);
    setNotes("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setFileInputKey((k) => k + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ Validations BEFORE loading (no stuck button)
    if (!fullName.trim()) return alert("Name is required");
    if (!phoneRegex.test(phone))
      return alert("Phone number must be like 0344-0208268");
    if (!photoFile) return alert("Profile photo is required");
    if (!photoFile.type.startsWith("image/"))
      return alert("Only image files are allowed");
    if (photoFile.size > 2 * 1024 * 1024) return alert("Max photo size is 2MB");
    if (!monthlyFee || Number.isNaN(Number(monthlyFee)) || monthlyFee <= 0)
      return alert("Monthly fee must be valid");

    setLoading(true);

    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!user) throw new Error("Owner not logged in");

      // 1) Create member
      const { data: member, error: insErr } = await supabase
        .from("members")
        .insert({
          owner_id: user.id,
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          join_date: joinDate,
          monthly_fee: Number(monthlyFee || DEFAULT_FEE),
          notes: notes.trim() || null,
          status: "active",
        })
        .select("id")
        .single();

      if (insErr) throw insErr;

      // 2) Upload photo (private bucket)
      const ext = photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${member.id}-${Date.now()}.${ext}`;
      const path = `${user.id}/members/${fileName}`; // ✅ owner folder

      const { error: upErr } = await supabase.storage
        .from("member-photos")
        .upload(path, photoFile, {
          upsert: true,
          contentType: photoFile.type,
        });

      if (upErr) throw upErr;

      // 3) Save path in DB
      const { error: updErr } = await supabase
        .from("members")
        .update({ photo_path: path })
        .eq("id", member.id);

      if (updErr) throw updErr;

      // done
      onCreated?.();
      reset();
      setOpen(false);
    } catch (err: any) {
      alert(err?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        // Optional: reset when closing dialog
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>Add Member</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add new member</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          {/* Photo (required) */}
          <div className="grid gap-2">
            <Label>Profile photo *</Label>

            {/* ✅ Use native input for file (more reliable than shadcn Input for files) */}
            <input
              key={fileInputKey}
              type="file"
              accept="image/*"
              required
              onChange={(e) => {
                const file = e.currentTarget.files?.[0] ?? null;
                setPhotoFile(file);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
            />

            {photoPreview ? (
              <div className="flex items-center gap-3">
                <img
                  src={photoPreview}
                  alt="Selected photo preview"
                  className="h-16 w-16 rounded-full object-cover border"
                />
                <div className="text-sm">
                  <div className="font-medium">{photoFile?.name}</div>
                  <div className="text-muted-foreground">
                    {photoFile?.size ? (photoFile.size / 1024).toFixed(0) : "0"}{" "}
                    KB
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                Select an image to preview
              </div>
            )}
          </div>

          {/* Name */}
          <div className="grid gap-2">
            <Label>Member name *</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ali Khan"
              required
            />
          </div>

          {/* Phone */}
          <div className="grid gap-2">
            <Label>Phone *</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(formatPkMobile(e.target.value))}
              placeholder="0344-0208268"
              inputMode="numeric"
              required
              maxLength={12} // 11 digits + dash
            />
            {phone.length > 0 && !phoneRegex.test(phone) && (
              <p className="text-xs text-red-500">
                Format must be: 0344-0208268
              </p>
            )}
          </div>

          {/* Email */}
          <div className="grid gap-2">
            <Label>Email (optional)</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. ali@gmail.com"
              type="email"
            />
          </div>

          {/* Join date + Fee */}
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
                onChange={(e) => setMonthlyFee(Number(e.target.value))}
                type="number"
                min={0}
                step="1"
                required
              />
            </div>
          </div>

          {/* Notes */}
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
              onClick={() => {
                reset();
                setOpen(false);
              }}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={loading || !isFormValid}>
              {loading ? "Saving..." : "Create Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
