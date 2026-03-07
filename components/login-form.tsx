"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"password" | "google" | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading("password");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(null);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogleSignIn() {
    setError(null);
    setLoading("google");

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(null);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6 w-full max-w-sm", className)} {...props}>
      <Card className="border border-border bg-card shadow-xl">
        <CardHeader>
          <div className="flex flex-col gap-1">
            <CardTitle className="font-mono text-2xl tracking-tight">
              FroshFunds
            </CardTitle>
            <div className="h-0.5 w-12 rounded-full bg-positive/60" aria-hidden />
          </div>
          <CardDescription className="text-muted-foreground pt-1">
            Entre na sua conta para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup className="gap-5">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Field>
                <FieldLabel htmlFor="email">E-mail</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading !== null}
                  aria-invalid={!!error}
                  className="w-full"
                />
              </Field>
              <Field>
                <div className="flex items-center justify-between w-full">
                  <FieldLabel htmlFor="password">Senha</FieldLabel>
                  <a
                    href="#"
                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Esqueceu a senha?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading !== null}
                  aria-invalid={!!error}
                  className="w-full"
                />
              </Field>
              <Field className="flex flex-col gap-3">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading !== null}
                  size="lg"
                >
                  {loading === "password" ? (
                    <>
                      <Loader2
                        data-icon="inline-start"
                        className="animate-spin"
                        aria-hidden
                      />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={loading !== null}
                >
                  {loading === "google" ? (
                    <>
                      <Loader2
                        data-icon="inline-start"
                        className="animate-spin"
                        aria-hidden
                      />
                      Redirecionando...
                    </>
                  ) : (
                    "Entrar com Google"
                  )}
                </Button>
                <FieldDescription className="text-center">
                  Não tem conta?{" "}
                  <Link
                    href="/register"
                    className="font-medium text-primary hover:underline underline-offset-4"
                  >
                    Cadastre-se
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
