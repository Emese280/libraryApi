import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { readJsonResponse } from "../../api";
import type { CurrentUser } from "../../App";
import { Button } from "../Button/Button";
import Input from "../Input/Input";

type LoginFormProps = {
  onLogin: (user: CurrentUser) => void;
};

type LoginResponse = {
  user?: CurrentUser;
  message?: string;
};

export default function LoginForm({ onLogin }: LoginFormProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo@library.test");
  const [password, setPassword] = useState("demo12345");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const result = await readJsonResponse<LoginResponse>(response);

      if (!response.ok || !result.user) {
        throw new Error(result.message ?? "Login failed.");
      }

      onLogin(result.user);
      navigate("/");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Login failed.");
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">Book Community</p>
        <h1>Login</h1>
        <p className="form-note">Ideiglenes demo fiokkal mar ki tudod probalni.</p>
      </div>

      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />

      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />

      <Button type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Logging in..." : "Login"}
      </Button>

      {message && <p className="form-message error">{message}</p>}

      <p className="form-link">
        Demo: <strong>demo@library.test</strong> / <strong>demo12345</strong>
      </p>

      <p className="form-link">
        Nincs meg fiokod? <Link to="/register">Regisztralj</Link>
      </p>
    </form>
  );
}
