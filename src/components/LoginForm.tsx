"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/actions";
import Logo from "@/components/Logo";
import Icon from "@/components/Icon";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: null });

  return (
    <main className="login">
      <form action={action} className="panel login__card">
        <div className="login__brand">
          <Logo />
          danke
        </div>
        <h1>Welcome back</h1>
        <label className="field__label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          name="password"
          autoFocus
          required
          autoComplete="current-password"
          className="input"
        />
        <p className="form-error" role="alert">
          {state.error && (
            <>
              <Icon name="alert" />
              {state.error}
            </>
          )}
        </p>
        <button type="submit" disabled={pending} className="btn btn--primary">
          {pending ? "Checking…" : "Unlock"}
        </button>
      </form>
    </main>
  );
}
