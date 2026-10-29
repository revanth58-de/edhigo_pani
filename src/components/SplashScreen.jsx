import React, { useState, useEffect } from 'react';
// Make sure your logo image is saved at src/assets/image.png (or update this path)
import dinasariLogo from '../assets/image.png';

export default function SplashScreen({ onFinish }) {
  // Animation stages: 'enter' -> 'exit' -> 'done'
  const [stage, setStage] = useState('enter');

  useEffect(() => {
    // Start exit transition after splash animation completes
    const exitTimer = setTimeout(() => {
      setStage('exit');
    }, 2400);

    // Unmount splash screen and reveal main app
    const finishTimer = setTimeout(() => {
      setStage('done');
      if (onFinish) onFinish();
    }, 3000);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  if (stage === 'done') return null;

  return (
    <div className={`dinasari-splash-overlay ${stage === 'exit' ? 'splash-exit' : ''}`}>
      <style>{`
        .dinasari-splash-overlay {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          background-color: #f3f5f0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          overflow: hidden;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          transition: background-color 0.5s ease, opacity 0.5s ease;
        }

        .dinasari-splash-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        /* Container holding the split layers of image.png */
        .dinasari-logo-stage {
          position: relative;
          width: 280px;
          height: 280px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .dinasari-layer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          /* Removes the off-white background of image.png seamlessly */
          mix-blend-mode: multiply;
          user-select: none;
          pointer-events: none;
        }

        /* Layer 1: Top Sun, Leaves, and Gear Emblem */
        .dinasari-emblem-layer {
          clip-path: inset(0% 0% 30% 0%);
          opacity: 0;
          animation: emblemRiseScale 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.1s forwards;
        }

        /* Layer 2: Bottom DINASARI 3D Green Text */
        .dinasari-title-layer {
          clip-path: inset(69% 0% 0% 0%);
          opacity: 0;
          animation: titleReveal 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.35s forwards;
        }

        /* Layer 3: Single-line Tagline directly under DINASARI (No dots) */
        .dinasari-single-tagline {
          margin-top: -26px;
          font-size: 14px;
          font-weight: 600;
          color: #2f5d34;
          letter-spacing: 0.9px;
          white-space: nowrap;
          text-align: center;
          opacity: 0;
          animation: taglineSlideUp 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.65s forwards;
        }

        /* Exit Transition (matches reference video slide & fade) */
        .splash-exit {
          opacity: 0;
          pointer-events: none;
        }

        .splash-exit .dinasari-emblem-layer {
          animation: emblemSlideRight 0.55s cubic-bezier(0.4, 0, 1, 1) forwards;
        }

        .splash-exit .dinasari-title-layer,
        .splash-exit .dinasari-single-tagline {
          animation: textBlurFade 0.45s ease-out forwards;
        }

        /* Keyframe Animations */
        @keyframes emblemRiseScale {
          0% {
            opacity: 0;
            transform: translateY(28px) scale(0.84);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes titleReveal {
          0% {
            opacity: 0;
            transform: translateY(18px) scale(0.94);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes taglineSlideUp {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes emblemSlideRight {
          0% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateX(130%) scale(0.95);
          }
        }

        @keyframes textBlurFade {
          0% {
            opacity: 1;
            filter: blur(0px);
            transform: translateX(0);
          }
          100% {
            opacity: 0;
            filter: blur(6px);
            transform: translateX(-24px);
          }
        }
      `}</style>

      <div className="dinasari-splash-card">
        <div className="dinasari-logo-stage">
          {/* Emblem Layer (Sun, Leaves, Gear) */}
          <img
            src={dinasariLogo}
            alt="DINASARI Emblem"
            className="dinasari-layer dinasari-emblem-layer"
          />

          {/* Wordmark Layer (DINASARI) */}
          <img
            src={dinasariLogo}
            alt="DINASARI Title"
            className="dinasari-layer dinasari-title-layer"
          />
        </div>

        {/* Single-line tagline directly underneath DINASARI without dots */}
        <p className="dinasari-single-tagline">
          Connect Collaborate Cultivate
        </p>
      </div>
    </div>
  );
}
