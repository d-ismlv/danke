"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/actions";
import Logo from "@/components/Logo";
import Icon from "@/components/Icon";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: null });

  return (
    <form action={action} className="panel anim-rise flex w-full max-w-sm flex-col gap-5 p-7">
      <div className="flex items-center gap-2.5">
        <Logo className="size-7" />
        <span className="font-semibold tracking-[-0.03em]">danke</span>
      </div>
      <div>
        <h1 className="h-page">Welcome back</h1>
        <p className="mt-1.5 text-sm text-muted">Enter your password to continue.</p>
      </div>
      <input
        type="password"
        name="password"
        autoFocus
        required
        placeholder="Password"
        className="input"
      />
      {state.error && (
        <p className="anim-fade flex items-center gap-2 text-sm text-again">
          <Icon name="alert" size={15} />
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary btn-lg">
        {pending ? "Checking…" : "Unlock"}
      </button>
    </form>
  );
}
