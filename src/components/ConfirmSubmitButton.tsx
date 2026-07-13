"use client";

import type { MouseEvent, ReactNode } from "react";

export default function ConfirmSubmitButton({
  children,
  message,
  className,
}: {
  children: ReactNode;
  message: string;
  className?: string;
}) {
  const confirm = (event: MouseEvent<HTMLButtonElement>) => {
    if (!window.confirm(message)) event.preventDefault();
  };

  return (
    <button type="submit" className={className} onClick={confirm}>
      {children}
    </button>
  );
}
