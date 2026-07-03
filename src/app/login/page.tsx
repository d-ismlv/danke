import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <LoginForm />
    </div>
  );
}
