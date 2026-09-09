"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Layout from "../../components/Layout";
import { useAuth } from "../../contexts/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "", fullName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await register(form);
      router.replace("/");
    } catch (err) {
      setError(err?.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <div className="card">
          <h1 className="mb-1">Create an account</h1>
          <p className="text-muted mb-6">Publish, search and analyse content.</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1">Username</label>
              <input id="username" className="input-field" value={form.username} onChange={set("username")} required />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
              <input id="email" type="email" className="input-field" value={form.email} onChange={set("email")} required />
            </div>
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium mb-1">Full name</label>
              <input id="fullName" className="input-field" value={form.fullName} onChange={set("fullName")} />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
              <input id="password" type="password" className="input-field" value={form.password} onChange={set("password")} required minLength={8} />
              <p className="text-xs text-muted mt-1">At least 8 characters.</p>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Creating account..." : "Sign up"}
            </button>
          </form>

          <p className="text-sm text-muted mt-6 text-center">
            Already have an account? <Link href="/login" className="text-primary-600 font-medium">Log in</Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}
