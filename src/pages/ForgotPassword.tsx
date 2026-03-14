import { useState } from "react";
import { Link } from "react-router-dom";
import { Warehouse, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [step, setStep] = useState<"email" | "otp" | "done">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpHint, setOtpHint] = useState("");

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post<{ message: string; otp_demo?: string }>("/auth/forgot-password", { email });
      if (res.otp_demo) setOtpHint(res.otp_demo);
      setStep("otp");
      toast({ title: "OTP Sent", description: "Check your email for the reset code." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { email, otp, new_password: newPassword });
      setStep("done");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(215,28%,10%)] via-[hsl(215,28%,14%)] to-[hsl(199,89%,20%)] p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
      </div>

      <Card className="w-full max-w-md border-sidebar-border bg-card/80 backdrop-blur-xl shadow-2xl relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
              <Warehouse className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === "email" && "Enter your email to receive an OTP"}
            {step === "otp" && "Enter the OTP and your new password"}
            {step === "done" && "Your password has been reset"}
          </p>
        </CardHeader>
        <CardContent>
          {step === "email" && (
            <form onSubmit={requestOtp} className="grid gap-4">
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-background/50" placeholder="you@company.com" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send OTP
              </Button>
              <Link to="/login" className="flex items-center gap-1 text-sm text-primary hover:underline justify-center">
                <ArrowLeft className="h-3 w-3" /> Back to login
              </Link>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={resetPassword} className="grid gap-4">
              {otpHint && (
                <div className="bg-info/10 border border-info/20 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Demo OTP (would be emailed in production):</p>
                  <p className="text-lg font-mono font-bold text-info tracking-[0.3em]">{otpHint}</p>
                </div>
              )}
              <div className="grid gap-2">
                <Label>OTP Code</Label>
                <Input value={otp} onChange={(e) => setOtp(e.target.value)} required className="bg-background/50 text-center font-mono tracking-[0.3em] text-lg" placeholder="000000" maxLength={6} />
              </div>
              <div className="grid gap-2">
                <Label>New Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} className="bg-background/50" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
              </Button>
            </form>
          )}

          {step === "done" && (
            <div className="text-center grid gap-4">
              <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
              <p className="text-sm text-muted-foreground">You can now sign in with your new password.</p>
              <Link to="/login">
                <Button className="w-full">Go to Login</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
