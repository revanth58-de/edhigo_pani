import React, { useState, useEffect } from 'react';
import './SplashScreen.css';
import dinasariLogo from './assets/image.png';

export default function DinasariSplashAndLogin() {
  // Phase: 'splash' (initial 0s-2.8s) -> 'morphed' (dark green hero + bottom sheet)
  const [phase, setPhase] = useState('splash');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  useEffect(() => {
    // Exact video timing: morph triggers at 2.8s
    const morphTimer = setTimeout(() => {
      setPhase('morphed');
    }, 2800);

    return () => clearTimeout(morphTimer);
  }, []);

  const isMorphed = phase === 'morphed';

  return (
    <div className={`screen-wrapper ${isMorphed ? 'state-morphed' : 'state-splash'}`}>
      {/* Background Gradient Layer for Dark Forest Green Transition */}
      <div className={`dark-bg-layer ${isMorphed ? 'active' : ''}`} />

      {/* Top Phone Status Bar */}
      <div className={`status-bar ${isMorphed ? 'dark-mode' : ''}`}>
        <span>11:11</span>
        <div className="dynamic-island" />
        <span>5G 100%</span>
      </div>

      {/* Hero Branding: Starts Centered, then smoothly glides up & scales into the top hero banner */}
      <div className={`hero-brand ${isMorphed ? 'morphed' : ''}`}>
        <div className="emblem-box">
          <img
            src={dinasariLogo}
            alt="DINASARI"
            className="emblem-img"
          />
        </div>
        <div className="tagline-container">
          <p className="tagline-text">
            Connect, Collaborate, Cultivate
          </p>
          <div className="shimmer-glow" />
        </div>
      </div>

      {/* White Login Bottom Sheet (Slides up smoothly from bottom) */}
      <div className={`bottom-sheet ${isMorphed ? 'open' : ''}`}>
        <div className="drag-handle" />
        <h2 className="welcome-title">Welcome Back</h2>

        <div className="input-field">
          <span className="field-icon">✉️</span>
          <input
            type="text"
            placeholder="Email or phone"
            className="field-input"
          />
        </div>

        <div className="input-field">
          <span className="field-icon">🔒</span>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            className="field-input"
          />
          <button
            type="button"
            className="eye-toggle"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        <div className="form-options-row">
          <label className="checkbox-wrap">
            <input
              type="checkbox"
              checked={keepSignedIn}
              onChange={(e) => setKeepSignedIn(e.target.checked)}
            />
            <span>Keep me signed in</span>
          </label>
          <a href="#forgot" className="forgot-pass">Forgot Password?</a>
        </div>

        <button type="button" className="login-btn">
          Log In
        </button>

        <div className="divider-row">
          <span>Or continue with</span>
        </div>

        <div className="social-row">
          <button type="button" className="social-card">
            <span>🇬</span> Google
          </button>
          <button type="button" className="social-card">
            <span></span> Apple
          </button>
        </div>

        <p className="signup-text">
          Don't have an account? <a href="#signup" className="signup-link">Sign Up</a>
        </p>
      </div>
    </div>
  );
}
