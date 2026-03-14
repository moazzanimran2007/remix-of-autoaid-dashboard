import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function AuthPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && session) {
      navigate("/", { replace: true });
    }
  }, [authLoading, session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Check your email to verify your account!");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset email sent!");
      setShowForgotPassword(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary mb-4">
            <Wrench className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">
            <span className="text-foreground">Mech</span>
            <span className="text-primary">AI</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Shop Assistant</p>
        </div>

        <div className="card-social p-6">
          {showForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground text-center">Reset Password</h2>
              <p className="text-xs text-muted-foreground text-center">Enter your email to receive a reset link</p>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border-foreground/15 h-11"
                required
              />
              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-primary text-primary-foreground h-11 font-semibold"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
              </Button>
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="text-xs text-accent hover:underline w-full text-center block"
              >
                Back to login
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground text-center">
                {isLogin ? "Sign In" : "Create Account"}
              </h2>

              {!isLogin && (
                <Input
                  type="text"
                  placeholder="Display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="rounded-xl border-foreground/15 h-11"
                  required
                />
              )}

              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border-foreground/15 h-11"
                required
              />

              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border-foreground/15 h-11"
                required
                minLength={6}
              />

              {isLogin && (
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-accent hover:underline block"
                >
                  Forgot password?
                </button>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-primary text-primary-foreground h-11 font-semibold"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isLogin ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          )}

          {!showForgotPassword && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-accent font-semibold hover:underline"
              >
                {isLogin ? "Sign Up" : "Sign In"}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
