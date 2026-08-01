import LoginForm from "./LoginForm";
import type { CurrentUser } from "../../App";

type LoginBubbleProps = {
  onLogin: (user: CurrentUser) => void;
};

export default function LoginBubble({ onLogin }: LoginBubbleProps) {
  return (
    <div className="login-bubble">
      <LoginForm onLogin={onLogin} />
    </div>
  );
}
