"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  AlertCircle,
  MessageCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import "@/styles/auth.css";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { login } = useAuth();
  const router = useRouter();

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await login(formData.email, formData.password);
      toast.success("Welcome back! 🎉");
      router.push("/chat");
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Login failed. Please try again.";
      toast.error(errorMessage);

      if (error.response?.status === 400) {
        setErrors({
          general: errorMessage,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Home Navigation */}
      <Link href="/" className="auth-home-btn">
        <div className="sidebar-title" >
          DSync
        </div>
      </Link>

      {/* Animated Background */}
      <div className="auth-bg">
        <div className="gradient-sphere sphere-1"></div>
        <div className="gradient-sphere sphere-2"></div>
        <div className="gradient-sphere sphere-3"></div>
        <div className="noise-overlay"></div>
      </div>

      {/* Left Panel - Branding */}
      <motion.div
        className="auth-branding"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="branding-content">
          <motion.div
            className="brand-logo"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          >
            <MessageCircle size={48} />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Welcome to DSync!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            Connect with friends and colleagues in real-time with our secure and
            lightning-fast messaging platform.
          </motion.p>
          <motion.div
            className="brand-features"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="feature-item">
              <Sparkles size={16} />
              <span>Real-time messaging</span>
            </div>
            <div className="feature-item">
              <Lock size={16} />
              <span>End-to-end encrypted</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Panel - Form */}
      <div className="auth-form-panel">
        <motion.div
          className="auth-card-modern"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="card-header">
            <motion.div
              className="mobile-logo"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <MessageCircle size={32} />
            </motion.div>
            <h2>Sign In</h2>
            <p>Welcome back! Please enter your details.</p>
          </div>

          <motion.form
            onSubmit={handleSubmit}
            className="auth-form-modern"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {errors.general && (
              <motion.div
                className="alert-error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AlertCircle size={16} />
                <span>{errors.general}</span>
              </motion.div>
            )}

            <div className="input-group">
              <label htmlFor="email">Email</label>
              <div className={`input-field ${errors.email ? "error" : ""}`}>
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <span className="error-text">
                  <AlertCircle size={12} />
                  {errors.email}
                </span>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className={`input-field ${errors.password ? "error" : ""}`}>
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <span className="error-text">
                  <AlertCircle size={12} />
                  {errors.password}
                </span>
              )}
            </div>

            <motion.button
              type="submit"
              className="submit-btn"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading ? (
                <div className="btn-loading">
                  <div className="spinner-small"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </motion.button>
          </motion.form>

          <motion.div
            className="card-footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p>
              Don't have an account?{" "}
              <Link href="/register" className="link-accent">
                Create account
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
