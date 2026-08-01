import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { readJsonResponse } from "../api";
import { Button } from "../components/Button/Button";
import Input from "../components/Input/Input";
import AuthLayout from "../layouts/AuthLayout";

type RegisterStatus = "idle" | "loading" | "success" | "error";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<RegisterStatus>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });
      const result = await readJsonResponse<{ message?: string }>(response);

      if (!response.ok) {
        throw new Error(result.message ?? "Registration failed.");
      }

      setStatus("success");
      setMessage("Sikeres regisztracio. A belepest kovetkezokent kotjuk be.");
      setName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Registration failed.");
    }
  }

  return (
    <AuthLayout>
      <div className="login-bubble">
        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <p className="eyebrow">Book Community</p>
            <h1>Register</h1>
          </div>

          <Input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

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
            minLength={8}
            required
          />

          <Button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Saving..." : "Create account"}
          </Button>

          {message && <p className={`form-message ${status}`}>{message}</p>}

          <p className="form-link">
            Mar van fiokod? <Link to="/login">Login</Link>
          </p>
        </form>
      </div>
    </AuthLayout>
  );
}
