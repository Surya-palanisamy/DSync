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
  User,
  AlertCircle,
  MessageCircle,
  ArrowRight,
  Shield,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import "@/styles/auth.css";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { register } = useAuth();
  const router = useRouter();

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

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
      await register(formData.name, formData.email, formData.password);
      toast.success("Account created successfully! 🎉");
      router.push("/chat");
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        "Registration failed. Please try again.";
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
      <Link href="/" className="auth-home-btn">
        <div className="sidebar-title">
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
            Join DSync Today
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            Create your account and start connecting with people around the
            world instantly.
          </motion.p>
          <motion.div
            className="brand-features"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="feature-item">
              <Zap size={16} />
              <span>Free forever</span>
            </div>
            <div className="feature-item">
              <Shield size={16} />
              <span>Privacy focused</span>
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
            <h2>Create Account</h2>
            <p>Get started with your free account today.</p>
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
              <label htmlFor="name">Full Name</label>
              <div className={`input-field ${errors.name ? "error" : ""}`}>
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  autoComplete="name"
                />
              </div>
              {errors.name && (
                <span className="error-text">
                  <AlertCircle size={12} />
                  {errors.name}
                </span>
              )}
            </div>

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
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  minLength="6"
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
              <span className="input-hint">Must be at least 6 characters</span>
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
                  <span>Creating account...</span>
                </div>
              ) : (
                <>
                  <span>Create Account</span>
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
              Already have an account?{" "}
              <Link href="/login" className="link-accent">
                Sign in
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
