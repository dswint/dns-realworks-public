"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  passwordChecks,
} from "@/lib/password";

export function PasswordFields() {
  const [password, setPassword] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const checks = passwordChecks(password);
  const mismatch = confirmValue.length > 0 && password !== confirmValue;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password_confirm">Confirm password</Label>
        <Input
          id="password_confirm"
          name="password_confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirmValue}
          onChange={(e) => setConfirmValue(e.target.value)}
        />
        {mismatch ? (
          <p className="text-destructive text-xs" role="alert">
            Passwords do not match.
          </p>
        ) : null}
      </div>
      <ul className="space-y-1 text-xs">
        {checks.map((check) => (
          <li
            key={check.id}
            className={check.ok ? "text-foreground" : "text-muted-foreground"}
          >
            {check.ok ? "✓" : "○"} {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
