"use client";

import { useAuth } from "@/context/AuthContext";
import {
  ArrowRight,
  Globe,
  Lock,
  LogOut,
  MessageCircle,
  Send,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  // Show simple loading state
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading DSync...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const features = [
    {
      icon: <Zap size={24} />,
      title: "Lightning Fast",
      description:
        "Real-time messaging with instant delivery and read receipts",
    },
    {
      icon: <Shield size={24} />,
      title: "Secure & Private",
      description: "End-to-end encryption keeps your conversations safe",
    },
    {
      icon: <Users size={24} />,
      title: "Group Chats",
      description: "Create groups and collaborate with teams seamlessly",
    },
    {
      icon: <Globe size={24} />,
      title: "Cross Platform",
      description: "Access your chats from any device, anywhere",
    },
  ];

  return (
    <div className="home-container">
      {/* Background */}
      <div className="home-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="grid-pattern"></div>
      </div>

      {/* Navigation */}
      <nav className="home-nav">
        <div className="nav-logo">
          <div className="logo-icon">
            <MessageCircle size={28} />
          </div>
          <span className="logo-text">DSync</span>
        </div>
        <div className="nav-links">
          {user ? (
            <>
              <span className="user-name">Welcome, {user.name}</span>
              <Link href="/chat" className="nav-link">
                Go to Chat
              </Link>
              <button onClick={handleLogout} className="nav-btn-logout">
                <LogOut size={16} />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="nav-link">
                Sign In
              </Link>
              <Link href="/register" className="nav-btn-primary">
                Get Started <ArrowRight size={16} />
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-title">
          Connect & Chat
          <br />
          <span className="gradient-text">Without Limits</span>
        </h1>

        <p className="hero-subtitle">
          Experience seamless communication with DSync. Fast, secure, and
          beautifully designed for modern conversations.
        </p>

        <div className="hero-cta">
          {user ? (
            <Link href="/chat" className="cta-primary">
              <span>Go to Chat</span>
              <Send size={18} />
            </Link>
          ) : (
            <>
              <Link href="/register" className="cta-primary">
                <span>Start Chatting Free</span>
                <Send size={18} />
              </Link>
              <Link href="/login" className="cta-secondary">
                <Lock size={18} />
                <span>Sign In</span>
              </Link>
            </>
          )}
        </div>

        <div className="hero-stats">
          <div className="stat-item">
            <span className="stat-number">10K+</span>
            <span className="stat-label">Active Users</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-number">1M+</span>
            <span className="stat-label">Messages Sent</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-number">99.9%</span>
            <span className="stat-label">Uptime</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-header">
          <h2>Why Choose DSync?</h2>
          <p>Everything you need for seamless communication</p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="cta-section">
          <div className="cta-card">
            <h2>Ready to get started?</h2>
            <p>Join thousands of users already connecting on DSync</p>
            <Link href="/register" className="cta-btn">
              Create Free Account
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <MessageCircle size={20} />
            <span>DSync</span>
          </div>
          <p>© 2026 DSync. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
