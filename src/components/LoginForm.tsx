"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/actions";

const initial: LoginState = { error: null };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initial);

  return (
    <form
      action={formAction}
      className="flex w-full max-w-xs flex-col gap-3 rounded-2xl border border-border bg-surface p-6"
    >
      <div className="flex items-center gap-2 font-semibold">
        <span className="grid size-7 place-items-center rounded-lg bg-accent text-accent-fg">
          d
        </span>
        danke
      </div>
      <p className="text-sm text-muted">Enter your password to continue.</p>
      <input
        type="password"
        name="password"
        autoFocus
        required
        placeholder="Password"
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
      />
      {state.error && (
        <p className="text-sm text-again">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-60"
      >
        {pending ? "Checking…" : "Unlock"}
      </button>
    </form>
  );
}
