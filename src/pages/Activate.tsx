import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const Activate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const reason = searchParams.get("reason");
  const [profile, setProfile] = useState<any>(null);
  const [phone, setPhone] = useState("");
  const [fee, setFee] = useState(310);
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState<string | null>(null); // tx id

  useEffect(() => {
    document.title = "Activate Account | SWAS Tasks";
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      setProfile(p);
      setPhone(p?.phone || "");
      if (p?.account_status === "active") navigate(redirectTo);
      const { data: s } = await supabase.from("app_settings").select("value").eq("key", "activation_fee").maybeSingle();
      if (s?.value) setFee(Number(s.value));
    })();
  }, [navigate]);

  // Poll for activation status while waiting
  useEffect(() => {
    if (!waiting) return;
    const interval = setInterval(async () => {
      const { data: tx } = await supabase.from("transactions").select("status").eq("id", waiting).maybeSingle();
      if (tx?.status === "success") {
        toast.success("Payment confirmed! Account activated.");
        clearInterval(interval);
        navigate(redirectTo);
      } else if (tx?.status === "failed") {
        toast.error("Payment failed or was cancelled.");
        clearInterval(interval);
        setWaiting(null);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [waiting, navigate]);

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^(?:\+?254|0)?[17]\d{8}$/.test(phone.replace(/\s/g, ""))) {
      toast.error("Enter a valid Safaricom number (07XXXXXXXX)");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("lipwa-stk-push", {
      body: { amount: fee, phone_number: phone, type: "activation" },
    });
    setLoading(false);
    if (error || !data?.success) {
      toast.error(data?.error || error?.message || "Could not initiate payment");
      return;
    }
    toast.success("STK push sent — check your phone");
    setWaiting(data.tx_id);
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container flex items-center justify-center py-16">
        <div className="w-full max-w-xl rounded-2xl border border-primary/20 bg-card/70 p-8 shadow-card">
          <h1 className="text-3xl font-black">Activate Your Tasking Account</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Hello, <span className="font-bold text-foreground">{profile?.full_name?.toUpperCase() || "USER"}</span>.{" "}
            {reason === "bid"
              ? <>Before you can <strong className="text-foreground">bid on this task</strong>, you must activate your tasking account.</>
              : <>To <strong className="text-foreground">start tasking</strong> and <strong className="text-foreground">bid on tasks</strong>, you must activate your account.</>}
          </p>

          <div className="mt-6 rounded-xl border border-primary/30 bg-secondary/40 p-5">
            <p className="text-sm">
              You will be charged a <strong>one-time fee of KES {fee}</strong> to activate your tasking account.
            </p>
          </div>

          <div className="mt-4 rounded-xl border-2 border-yellow-300 bg-yellow-400/20 p-5 shadow-[0_0_20px_rgba(250,204,21,0.35)]">
            <p className="text-sm font-semibold leading-relaxed text-yellow-200">
              Kindly complete the one-time access fee to secure full ownership of your <strong className="text-yellow-100">SwasTasks</strong> account,
              enable seamless system integration, and ensure withdrawals are processed securely to your registered payment number.
            </p>
          </div>

          {waiting ? (
            <div className="mt-8 flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-center font-semibold">Waiting for M-Pesa confirmation…</p>
              <p className="text-center text-sm text-muted-foreground">Enter your M-Pesa PIN on your phone to complete payment.</p>
            </div>
          ) : (
            <form onSubmit={pay} className="mt-6 space-y-4">
              <div>
                <Label>Enter M-PESA Phone Number</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" required />
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                {loading ? "Sending STK..." : `Pay KES ${fee} & Activate`}
              </Button>
              <p className="text-center text-xs text-muted-foreground">Your phone will receive a secure M-PESA STK prompt.</p>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Activate;
