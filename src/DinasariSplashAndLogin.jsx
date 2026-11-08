import React, { useState, useEffect } from 'react';
import './SplashScreen.css';
import dinasariLogo from './assets/image.png';

export default function DinasariSplashAndLogin() {
  // Phases: 'splash' -> 'exit' -> 'login'
  const [phase, setPhase] = useState('splash');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  useEffect(() => {
    // 1. Trigger exit animation at 2.0 seconds
    const exitTimer = setTimeout(() => {
      setPhase('exit');
    }, 2000);

    // 2. Switch to Login screen at 2.6 seconds
    const loginTimer = setTimeout(() => {
      setPhase('login');
    }, 2600);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(loginTimer);
    };
  }, []);

  // --- SPLASH SCREEN VIEW ---
  if (phase === 'splash' || phase === 'exit') {
    return (
      <div className="splash-screen">
        <div className={`splash-content ${phase === 'exit' ? 'slide-out' : 'animate-in'}`}>
          <div className="logo-wrapper">
            <img
              src={dinasariLogo}
              alt="DINASARI Logo"
              className="dinasari-logo-img"
            />
          </div>
          <p className="dinasari-tagline">
            Connect Collaborate Cultivate
          </p>
        </div>
      </div>
    );
  }

  // --- MAIN / LOGIN SCREEN VIEW ---
  return (
    <div className="login-screen">
      {/* Top Green Curved Header */}
      <div className="header-banner">
        <div className="header-text">
          <h1 className="header-brand">DINASARI</h1>
          <p className="header-subtitle">
            Connect Collaborate<br />Cultivate
          </p>
        </div>
        <div className="header-illustration">
          <img
            src={dinasariLogo}
            alt="DINASARI"
            className="header-logo-img"
          />
        </div>
      </div>

      {/* Welcome Back Form */}
      <div className="login-form-container">
        <h2 className="welcome-title">Welcome Back</h2>

        <div className="input-group">
          <span className="input-icon">✉️</span>
          <input
            type="text"
            placeholder="Email or phone"
            className="form-input"
          />
        </div>

        <div className="input-group">
          <span className="input-icon">🔒</span>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            className="form-input"
          />
          <button
            type="button"
            className="eye-btn"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        <div className="form-options">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={keepSignedIn}
              onChange={(e) => setKeepSignedIn(e.target.checked)}
            />
            <span className="custom-checkbox"></span>
            Keep me signed in
          </label>
          <a href="#forgot" className="forgot-link">Forgot Password?</a>
        </div>

        <button type="button" className="login-btn">
          Log In
        </button>

        <div className="divider">
          <span>Or continue with</span>
        </div>

        <div className="social-buttons">
          <button type="button" className="social-btn">
            <span className="social-icon">G</span> Google
          </button>
          <button type="button" className="social-btn">
            <span className="social-icon"></span> Apple
          </button>
        </div>

        <p className="signup-prompt">
          Don't have an account? <a href="#signup">Sign Up</a>
        </p>
      </div>
    </div>
  );
}
