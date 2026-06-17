import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/password-reset")({
  component: PasswordResetPage,
});

function PasswordResetPage() {
  return <div />;
}
