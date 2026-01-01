import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function AppHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  return (
    <header className="border-b bg-background">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="font-semibold">Gym Fee Manager</div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.email}</span>

          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
