"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/actions";
import Logo from "@/components/Logo";
import Icon from "@/components/Icon";

const initial: LoginState = { error: null };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initial);

  return (
    <form
      action={formAction}
      className="panel anim-rise flex w-full max-w-sm flex-col gap-4 p-7"
    >
      <div className="flex items-center gap-2 font-semibold">
        <Logo />
        danke
      </div>
      <div>
        <p className="eyebrow mb-1">Private library</p>
        <h1 className="display-title text-2xl">Welcome back</h1>
        <p className="mt-2 text-sm text-muted">Enter your password to continue.</p>
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
        <p className="anim-settle flex items-center gap-2 rounded-lg bg-again-tint px-3 py-2 text-sm text-again">
          <Icon name="alert" size={15} />
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="button-primary"
      >
        {pending ? (
          "Checking…"
        ) : (
          <>
            <Icon name="lock" size={15} />
            Unlock
          </>
        )}
      </button>
    </form>
  );
}
