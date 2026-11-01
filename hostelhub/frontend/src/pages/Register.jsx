import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getAuthConfig } from "../services/authService";
import "./Auth.css";

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "", hostel: "", branch: "", year: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [allowedDomains, setAllowedDomains] = useState([]);

  useEffect(() => {
    getAuthConfig().then(setAllowedDomains).catch(() => {});
  }, []);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required.";
    if (!form.email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      errs.email = "Enter a valid email address.";
    }
    if (!form.password || form.password.length < 6) {
      errs.password = "Password must be at least 6 characters.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      await register({ ...form, email: form.email.trim().toLowerCase() });
      toast.success("Account created — welcome to HostelHub.");
      navigate("/marketplace", { replace: true });
    } catch (err) {
      setFormError(err.message || "Something went wrong. Please try again.");
      if (err.fields) setErrors((e) => ({ ...e, ...err.fields }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card card auth-card-wide">
        <h1>Create your HostelHub account</h1>
        <p className="auth-sub">Join your campus marketplace in a minute.</p>

        {formError && <div className="error-banner">{formError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className={errors.name ? "has-error" : ""}
              placeholder="Jordan Smith"
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className={errors.email ? "has-error" : ""}
              placeholder="you@college.edu"
              autoComplete="email"
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
            {allowedDomains.length > 0 && !errors.email && (
              <span className="field-hint">Use your college email ({allowedDomains.map((d) => "@" + d).join(", ")}).</span>
            )}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className={errors.password ? "has-error" : ""}
                autoComplete="new-password"
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="Optional" />
            </div>
            <div className="field">
              <label htmlFor="hostel">Hostel</label>
              <input id="hostel" value={form.hostel} onChange={(e) => update("hostel", e.target.value)} placeholder="e.g. Block C" />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="branch">Branch</label>
              <input id="branch" value={form.branch} onChange={(e) => update("branch", e.target.value)} placeholder="e.g. CSE" />
            </div>
            <div className="field">
              <label htmlFor="year">Year</label>
              <select id="year" value={form.year} onChange={(e) => update("year", e.target.value)}>
                <option value="">Select year</option>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
