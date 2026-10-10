import { useState } from "react";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      if (!data.token || !data.user) {
        throw new Error("Invalid login response from server.");
      }

      onLogin(data);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Unable to connect to the server. Please check that the backend is running."
          : err.message,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <div className="login-brand">
          <div className="brand-logo">N</div>
          <span>Nexora</span>
        </div>

        <div className="login-brand-content">
          <div className="login-eyebrow">EMPLOYEE MANAGEMENT SYSTEM</div>
          <h1>Great teams start with better management.</h1>
          <p>
            One workspace to manage employees, departments and your
            organization's workforce.
          </p>

          <div className="login-feature">
            <span>✓</span>
            Centralized employee management
          </div>
          <div className="login-feature">
            <span>✓</span>
            Organized departments and teams
          </div>
          <div className="login-feature">
            <span>✓</span>
            Role-based access
          </div>
        </div>

        <div className="login-brand-footer">
          Nexora · Employee Management System
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-container">
          <div className="login-mobile-brand">
            <div className="brand-logo">N</div>
            <strong>Nexora</strong>
          </div>

          <div className="login-welcome">
            <div className="login-eyebrow">WELCOME BACK</div>
            <h2>Sign in to Nexora</h2>
            <p>Enter your account details to continue.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@company.com"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <div className="password-label-row">
              <label htmlFor="login-password">Password</label>
            </div>

            <div className="password-input-wrap">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="primary-button login-submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <span>→</span>}
            </button>
          </form>

          <div className="login-security-note">
            <span>♢</span>
            Secure access to your employee workspace
          </div>
        </div>
      </section>
    </main>
  );
}

export default Login;
