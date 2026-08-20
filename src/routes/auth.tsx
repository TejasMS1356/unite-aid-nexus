import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Radar } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In | SahayGrid Rescue Coordination" },
      {
        name: "description",
        content:
          "Secure access for registered rescue agencies and command staff on the national disaster coordination grid.",
      },
      { property: "og:title", content: "Sign In | SahayGrid Rescue Coordination" },
      {
        property: "og:description",
        content: "Secure access for registered rescue agencies and command staff.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const credentials = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  fullName: z.string().trim().max(100).optional(),
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const run = async (mode: "in" | "up") => {
    const parsed = credentials.safeParse({ email, password, fullName });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: parsed.data.fullName ?? "" },
          },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/dashboard" });
        else toast.success("Check your email to confirm your account.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error("Google sign-in failed");
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="panel w-full max-w-md p-6">
        <div className="mb-6 flex items-center gap-2">
          <Radar className="h-5 w-5 text-primary" />
          <span className="font-display text-lg font-bold">
            SAHAY<span className="text-primary">GRID</span>
          </span>
        </div>
        <h1 className="text-xl font-bold">Authorised access only</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rescue agency and command staff credentials required.
        </p>

        <Tabs defaultValue="in" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="in">Sign in</TabsTrigger>
            <TabsTrigger value="up">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="in" className="space-y-3 pt-4">
            <Field label="Official email" value={email} onChange={setEmail} type="email" />
            <Field label="Password" value={password} onChange={setPassword} type="password" />
            <Button className="w-full" disabled={busy} onClick={() => run("in")}>
              Enter command grid
            </Button>
          </TabsContent>

          <TabsContent value="up" className="space-y-3 pt-4">
            <Field label="Full name" value={fullName} onChange={setFullName} />
            <Field label="Official email" value={email} onChange={setEmail} type="email" />
            <Field label="Password" value={password} onChange={setPassword} type="password" />
            <Button className="w-full" disabled={busy} onClick={() => run("up")}>
              Create account
            </Button>
          </TabsContent>
        </Tabs>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="label-mono">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" className="w-full" onClick={google}>
          Continue with Google
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="label-mono">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
