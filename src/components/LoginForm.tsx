"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/actions";
import Logo from "@/components/Logo";

const initial: LoginState = { error: null };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initial);

  return (
    <form
      action={formAction}
      className="panel flex w-full max-w-sm flex-col gap-4 p-7"
    >
      <div className="flex items-center gap-2 font-semibold">
        <Logo />
        danke
      </div>
      <div>
        <p className="eyebrow mb-1">Private library</p>
        <h1 className="display-title text-3xl">Welcome back</h1>
        <p className="mt-2 text-sm text-muted">Enter your password to continue.</p>
      </div>
      <input
        type="password"
        name="password"
        autoFocus
        required
        placeholder="Password"
        className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
      />
      {state.error && (
        <p className="text-sm text-again">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="button-primary"
      >
        {pending ? "Checking…" : "Unlock"}
      </button>
    </form>
  );
}
