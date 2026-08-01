import AuthLayout from "../layouts/AuthLayout";
import LoginBubble from "../components/LoginBubble/LoginBubble";
import type { CurrentUser } from "../App";

type LoginProps = {
  onLogin: (user: CurrentUser) => void;
};

export default function Login({ onLogin }: LoginProps) {
  return (
    <AuthLayout>
      <LoginBubble onLogin={onLogin} />
    </AuthLayout>
  );
}
