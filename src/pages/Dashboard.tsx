import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  poster_name: string;
  budget: number;
  currency: string;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [method, setMethod] = useState<"mpesa" | "paypal">("mpesa");
  const [wAmount, setWAmount] = useState("");
  const [wName, setWName] = useState("");
  const [wPhone, setWPhone] = useState("");
  const [wEmail, setWEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Dashboard | SWAS Tasks";
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const [{ data: p }, { data: w }, { data: t }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("tasks").select("id,title,poster_name,budget,currency,created_at").eq("status", "open").order("created_at", { ascending: false }).limit(8),
      ]);
      setProfile(p);
      setWallet(w);
      setTasks((t as Task[]) || []);
      setLoading(false);
    })();
  }, [navigate]);

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
    navigate("/");
  };

  const handleStartTasking = () => {
    if (profile?.account_status !== "active") {
      navigate("/activate?reason=start");
    } else {
      toast.info("Browse tasks below and click View / Bid to begin.");
    }
  };

  const handleWithdraw = async () => {
    const balance = Number(wallet?.balance ?? 0);
    const amount = Number(wAmount);

    if (balance <= 0) {
      toast.error("Your balance is KES 0. Nothing to withdraw.");
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount greater than 0.");
      return;
    }
    if (amount > balance) {
      toast.error(`Amount cannot exceed your balance (KES ${balance.toFixed(2)}).`);
      return;
    }

    if (method === "mpesa") {
      if (!wName.trim()) { toast.error("Enter your full name."); return; }
      if (!/^(?:\+?254|0)?[17]\d{8}$/.test(wPhone.replace(/\s/g, ""))) {
        toast.error("Enter a valid Safaricom number (07XXXXXXXX)");
        return;
      }
    } else {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(wEmail)) {
        toast.error("Enter a valid PayPal email.");
        return;
      }
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setWithdrawOpen(false);
      setWAmount(""); setWName(""); setWPhone(""); setWEmail("");
      toast.success("Withdrawal request submitted. You'll be notified once processed.");
    }, 800);
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading…</div>;

  const memberYear = profile?.created_at ? new Date(profile.created_at).getFullYear() : new Date().getFullYear();

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container py-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black">Hello, {profile?.full_name?.toUpperCase()}</h1>
            <p className="mt-2 text-muted-foreground">Welcome back. Quick overview of your activity.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="hero" onClick={handleStartTasking}>Start Tasking</Button>
            <Button variant="glow" onClick={() => toast.info("Task posting opens in phase 2.")}>Post Task</Button>
            <Button variant="secondary" onClick={() => setWithdrawOpen(true)}>Withdraw</Button>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-primary/20 bg-card/70 p-6 shadow-card">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-brand text-3xl font-black text-primary-foreground">
              {profile?.full_name?.[0]?.toUpperCase() || "U"}
            </div>
            <h2 className="mt-4 text-center text-xl font-bold">{profile?.full_name?.toUpperCase()}</h2>
            <p className="text-center text-sm text-muted-foreground">{profile?.email}</p>
            <p className="text-center text-sm text-muted-foreground">{profile?.country || "Kenya"}</p>
            <p className="text-center text-sm text-muted-foreground">Member since: {memberYear}</p>

            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-secondary/50 p-3"><p className="text-2xl font-black">826</p><p className="text-xs text-muted-foreground">Tasks Posted</p></div>
              <div className="rounded-lg bg-secondary/50 p-3"><p className="text-2xl font-black">0</p><p className="text-xs text-muted-foreground">Tasks Completed</p></div>
              <div className="rounded-lg bg-secondary/50 p-3"><p className="text-2xl font-black">0</p><p className="text-xs text-muted-foreground">Bids Made</p></div>
            </div>

            <div className="mt-6 rounded-xl bg-gradient-brand py-3 text-center font-bold text-primary-foreground">
              Balance: KES {Number(wallet?.balance ?? 0).toFixed(2)}
            </div>

            <Button onClick={logout} variant="destructive" className="mt-4 w-full">Logout</Button>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-primary/20 bg-card/70 p-6">
              <h2 className="text-2xl font-bold">Your Bidded Tasks</h2>
              <p className="mt-1 text-sm text-muted-foreground">Recent bids you made</p>
              <p className="mt-6 text-sm text-muted-foreground">You have not placed any bids yet.</p>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-card/70 p-6">
              <h2 className="text-2xl font-bold">Active Tasks</h2>
              <p className="mt-1 text-sm text-muted-foreground">Latest tasks open for bidding</p>

              <div className="mt-6 space-y-4">
                {tasks.length === 0 && (
                  <p className="text-sm text-muted-foreground">No active tasks right now. Check back soon.</p>
                )}
                {tasks.map((t) => (
                  <div key={t.id} className="flex flex-col gap-3 rounded-xl border border-primary/10 bg-secondary/30 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold leading-snug">{t.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        By {t.poster_name} • Posted {new Date(t.created_at).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-black text-primary">{t.currency} {Number(t.budget).toLocaleString()}</span>
                      <Button asChild variant="hero" size="sm">
                        <Link to={`/tasks/${t.id}`}>View / Bid</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-center">
                <Button asChild variant="glow">
                  <Link to="/tasks">View All Tasks</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-card/70 p-6">
              <h2 className="text-2xl font-bold">Your Posted Tasks</h2>
              <p className="mt-1 text-sm text-muted-foreground">Tasks you have created</p>
              <p className="mt-6 text-sm text-muted-foreground">You haven't posted any tasks yet.</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>
              Available balance: <span className="font-bold text-primary">KES {Number(wallet?.balance ?? 0).toFixed(2)}</span>
            </DialogDescription>
          </DialogHeader>

          <Tabs value={method} onValueChange={(v) => setMethod(v as "mpesa" | "paypal")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="mpesa">M-PESA</TabsTrigger>
              <TabsTrigger value="paypal">PayPal</TabsTrigger>
            </TabsList>

            <div className="mt-4 space-y-3">
              <div>
                <Label>Amount (KES)</Label>
                <Input type="number" min="1" value={wAmount} onChange={(e) => setWAmount(e.target.value)} placeholder="0" />
              </div>
            </div>

            <TabsContent value="mpesa" className="mt-3 space-y-3">
              <div>
                <Label>Full Name</Label>
                <Input value={wName} onChange={(e) => setWName(e.target.value)} placeholder="John Doe" />
              </div>
              <div>
                <Label>M-PESA Phone Number</Label>
                <Input value={wPhone} onChange={(e) => setWPhone(e.target.value)} placeholder="07XXXXXXXX" />
              </div>
            </TabsContent>

            <TabsContent value="paypal" className="mt-3 space-y-3">
              <div>
                <Label>PayPal Email</Label>
                <Input type="email" value={wEmail} onChange={(e) => setWEmail(e.target.value)} placeholder="you@example.com" />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawOpen(false)} disabled={submitting}>Cancel</Button>
            <Button variant="hero" onClick={handleWithdraw} disabled={submitting}>
              {submitting ? "Processing…" : "Submit Withdrawal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
