import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Sorteiaí" },
      { name: "description", content: "Crie seu login para gerenciar seus sorteios com segurança." },
      { property: "og:title", content: "Entrar — Sorteiaí" },
      { property: "og:description", content: "Acesse o painel dos seus sorteios." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel" });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/painel" });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === "up") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/painel` },
      });
      if (error) toast.error(error.message);
      else if (!data.session) toast.success("Conta criada! Confirme pelo link enviado ao seu e-mail.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("E-mail ou senha inválidos");
    }
    setLoading(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Não foi possível entrar com Google");
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-sm px-5 py-8">
        <h1 className="text-3xl font-extrabold">{mode === "up" ? "Crie seu login de organizador" : "Bem-vindo de volta"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Somente você poderá editar, dar baixa e sortear os sorteios que criar.
        </p>
        <Button variant="outline" size="lg" className="mt-6 w-full" onClick={google}>
          Continuar com Google
        </Button>
        <div className="my-5 text-center text-xs text-muted-foreground">ou com e-mail</div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="pw">Senha</Label>
            <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {mode === "up" ? "Criar conta" : "Entrar"}
          </Button>
        </form>
        <button className="mt-4 w-full text-sm text-primary underline-offset-4 hover:underline" onClick={() => setMode(mode === "up" ? "in" : "up")}>
          {mode === "up" ? "Já tenho conta — entrar" : "Não tenho conta — criar"}
        </button>
      </main>
    </div>
  );
}
