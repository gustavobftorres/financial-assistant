import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex w-full max-w-sm items-center justify-center">
      <LoginForm className="w-full opacity-0 animate-fade-in-up" style={{ animationDelay: "0.1s" }} />
    </div>
  );
}
