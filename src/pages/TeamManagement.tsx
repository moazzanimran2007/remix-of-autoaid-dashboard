import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, UserPlus, Trash2, Mail, Shield, Wrench } from "lucide-react";

export default function TeamManagement() {
  const { user, organisationId } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");

  // Fetch org info
  const { data: org } = useQuery({
    queryKey: ["organisation", organisationId],
    queryFn: async () => {
      if (!organisationId) return null;
      const { data, error } = await supabase
        .from("organisations")
        .select("*")
        .eq("id", organisationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!organisationId,
  });

  // Fetch members
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["team-members", organisationId],
    queryFn: async () => {
      if (!organisationId) return [];
      const { data, error } = await supabase
        .from("organisation_members")
        .select("id, user_id, role, joined_at")
        .eq("organisation_id", organisationId);
      if (error) throw error;

      // Fetch profiles for each member
      const userIds = data.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      return data.map((m: any) => ({
        ...m,
        profile: profiles?.find((p: any) => p.id === m.user_id),
      }));
    },
    enabled: !!organisationId,
  });

  // Fetch pending invites
  const { data: invites = [], isLoading: loadingInvites } = useQuery({
    queryKey: ["team-invites", organisationId],
    queryFn: async () => {
      if (!organisationId) return [];
      const { data, error } = await supabase
        .from("organisation_invites")
        .select("*")
        .eq("organisation_id", organisationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organisationId,
  });

  // Add invite
  const addInvite = useMutation({
    mutationFn: async (inviteEmail: string) => {
      if (!organisationId || !user) throw new Error("No organisation");
      const { error } = await supabase.from("organisation_invites").insert({
        organisation_id: organisationId,
        email: inviteEmail.toLowerCase().trim(),
        invited_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mechanic invited!");
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["team-invites"] });
    },
    onError: (err: any) => {
      if (err.message?.includes("duplicate")) {
        toast.error("This email has already been invited");
      } else {
        toast.error(err.message);
      }
    },
  });

  // Remove invite
  const removeInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from("organisation_invites")
        .delete()
        .eq("id", inviteId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invite removed");
      queryClient.invalidateQueries({ queryKey: ["team-invites"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Remove member
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("organisation_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Member removed");
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    addInvite.mutate(email);
  };

  if (!organisationId) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>You are not part of any organisation yet.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">{org?.name || "Your Team"}</h1>
        <p className="text-sm text-muted-foreground">Manage your shop team</p>
      </div>

      {/* Add Mechanic */}
      <div className="card-social p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Invite Mechanic
        </h2>
        <form onSubmit={handleInvite} className="flex gap-2">
          <Input
            type="email"
            placeholder="mechanic@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 rounded-xl border-foreground/15 h-10"
            required
          />
          <Button
            type="submit"
            disabled={addInvite.isPending}
            className="rounded-xl bg-primary text-primary-foreground h-10 px-4"
          >
            {addInvite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">
          The mechanic will be able to sign up using this email and auto-join your shop.
        </p>
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Pending Invites
          </h2>
          <div className="space-y-2">
            {invites.map((invite: any) => (
              <div
                key={invite.id}
                className="card-social p-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm text-foreground">{invite.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Invited {new Date(invite.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeInvite.mutate(invite.id)}
                  disabled={removeInvite.isPending}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Members */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          Team Members
        </h2>
        {loadingMembers ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No team members yet</p>
        ) : (
          <div className="space-y-2">
            {members.map((member: any) => (
              <div
                key={member.id}
                className="card-social p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {(member.profile?.display_name || "?")[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {member.profile?.display_name || "Unknown"}
                    </p>
                    <div className="flex items-center gap-1">
                      {member.role === "owner" ? (
                        <Shield className="h-3 w-3 text-primary" />
                      ) : (
                        <Wrench className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span className="text-xs text-muted-foreground capitalize">{member.role}</span>
                    </div>
                  </div>
                </div>
                {member.role !== "owner" && member.user_id !== user?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMember.mutate(member.id)}
                    disabled={removeMember.isPending}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
