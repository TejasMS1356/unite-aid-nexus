import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { timeAgo } from "@/lib/geo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Agency Verification | SahayGrid Admin" },
      {
        name: "description",
        content:
          "Command staff console to review, verify or reject rescue agency registrations before they go live on the national grid.",
      },
      { property: "og:title", content: "Agency Verification | SahayGrid Admin" },
      {
        property: "og:description",
        content: "Review and verify rescue agency registrations for the national grid.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const qc = useQueryClient();

  const { data: agencies } = useQuery({
    queryKey: ["admin-agencies"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencies")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "verified" | "rejected" | "pending" }) => {
      const { error } = await supabase.from("agencies").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agency status updated");
      qc.invalidateQueries({ queryKey: ["admin-agencies"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!isAdmin) {
    return (
      <div className="panel p-8 text-center">
        <h1 className="text-xl font-bold">Restricted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This console is limited to authorised command staff.
        </p>
      </div>
    );
  }

  const list = agencies ?? [];
  const pending = list.filter((a) => a.status === "pending");

  return (
    <div className="space-y-6">
      <div>
        <p className="label-mono">Command staff console</p>
        <h1 className="text-2xl font-bold">Agency verification</h1>
        <p className="text-sm text-muted-foreground">
          {pending.length} agency registration{pending.length === 1 ? "" : "s"} awaiting review.
        </p>
      </div>

      <div className="panel divide-y divide-border">
        {list.length === 0 && <p className="p-6 text-sm text-muted-foreground">No agencies registered.</p>}
        {list.map((a) => (
          <div key={a.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">{a.name}</p>
              <p className="text-xs text-muted-foreground">
                {a.agency_type} · {[a.district, a.state].filter(Boolean).join(", ") || "Location unset"} ·{" "}
                {a.personnel_count} personnel · registered {timeAgo(a.created_at)}
              </p>
              <p className="text-xs text-muted-foreground">
                {a.contact_person ? `${a.contact_person} · ` : ""}
                {a.contact_phone ?? "no phone"} · {a.contact_email ?? "no email"}
              </p>
              {(a.capabilities ?? []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(a.capabilities ?? []).map((c) => (
                    <span key={c} className="rounded border border-border px-2 py-0.5 text-[11px]">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-secondary px-2 py-1 text-[11px] uppercase text-muted-foreground">
                {a.status}
              </span>
              {a.status !== "verified" && (
                <Button size="sm" onClick={() => setStatus.mutate({ id: a.id, status: "verified" })}>
                  <ShieldCheck className="mr-1 h-4 w-4" /> Verify
                </Button>
              )}
              {a.status !== "rejected" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStatus.mutate({ id: a.id, status: "rejected" })}
                >
                  <ShieldX className="mr-1 h-4 w-4" /> Reject
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
