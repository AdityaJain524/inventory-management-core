import { useState, useEffect } from "react";
import { User, Shield, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileData {
  id: number; email: string; first_name: string; last_name: string; role: string; created_at: string;
}

export default function Profile() {
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "" });
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "" });

  useEffect(() => {
    api.get<ProfileData>("/profile")
      .then((p) => { setProfile(p); setForm({ first_name: p.first_name, last_name: p.last_name, email: p.email }); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    try {
      const updated = await api.put<ProfileData>("/profile", form);
      setProfile(updated);
      toast({ title: "Profile updated" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const changePassword = async () => {
    try {
      await api.put("/profile/password", pwForm);
      toast({ title: "Password updated" });
      setPwForm({ current_password: "", new_password: "" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your account settings</p>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>First Name</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Last Name</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
            </div>
            <div className="grid gap-2"><Label>Email</Label><Input value={form.email} type="email" onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Role</Label><Input value={profile?.role || ""} disabled /></div>
            <div className="grid gap-2"><Label>Joined</Label><Input value={profile ? new Date(profile.created_at).toLocaleDateString() : ""} disabled /></div>
            <Button className="w-fit" onClick={saveProfile}>Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Security</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2"><Label>Current Password</Label><Input type="password" value={pwForm.current_password} onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })} /></div>
            <div className="grid gap-2"><Label>New Password</Label><Input type="password" value={pwForm.new_password} onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} /></div>
            <Button variant="outline" className="w-fit" onClick={changePassword}>Update Password</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
