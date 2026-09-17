"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/actions";
import Logo from "@/components/Logo";
import Icon from "@/components/Icon";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: null });

  return (
    <form action={action} className="sign-in">
      <div className="sign-in__brand">
        <Logo />
        danke
      </div>
      <div>
        <h1>Welcome back</h1>
        <p>Enter your password to continue.</p>
      </div>
      <input
        type="password"
        name="password"
        autoFocus
        required
        placeholder="Password"
        className="text-field"
        aria-label="Password"
      />
      {state.error && (
        <p className="form-error">
          <Icon name="alert" />
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="primary-action">
        {pending ? "Checking…" : "Unlock"}
      </button>
    </form>
  );
}
