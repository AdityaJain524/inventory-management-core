import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Warehouse, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState({ email: "", password: "", first_name: "", last_name: "", role: "Inventory Manager" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(form);
      navigate("/");
    } catch (err: any) {
      toast({ title: "Signup Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(215,28%,10%)] via-[hsl(215,28%,14%)] to-[hsl(199,89%,20%)] p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
      </div>

      <Card className="w-full max-w-md border-sidebar-border bg-card/80 backdrop-blur-xl shadow-2xl relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
              <Warehouse className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Create Account
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Join CoreInventory to manage your stock</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>First Name</Label>
                <Input value={form.first_name} onChange={(e) => update("first_name", e.target.value)} required className="bg-background/50" />
              </div>
              <div className="grid gap-2">
                <Label>Last Name</Label>
                <Input value={form.last_name} onChange={(e) => update("last_name", e.target.value)} required className="bg-background/50" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required className="bg-background/50" placeholder="you@company.com" />
            </div>
            <div className="grid gap-2">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  required
                  minLength={6}
                  className="bg-background/50 pr-10"
                  placeholder="Min. 6 characters"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => update("role", v)}>
                <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inventory Manager">Inventory Manager</SelectItem>
                  <SelectItem value="Warehouse Staff">Warehouse Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
