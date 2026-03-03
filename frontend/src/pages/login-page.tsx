import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import type { Role } from "../types";

export function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("STUDENT");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register({ name, email, password, role });
      }
      navigate("/courses");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h1>{mode === "login" ? "Login" : "Create account"}</h1>
        {mode === "register" && (
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {mode === "register" && (
          <label>
            Role
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="STUDENT">Student</option>
              <option value="INSTRUCTOR">Instructor</option>
            </select>
          </label>
        )}
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Please wait..." : mode === "login" ? "Login" : "Register"}
        </button>
        <button type="button" className="ghost" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Need an account?" : "Already have an account?"}
        </button>
      </form>
    </div>
  );
}
