import React, { useState } from 'react';
import SplashScreen from './components/SplashScreen';

export default function App() {
  const [isSplashComplete, setIsSplashComplete] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  return (
    <>
      {!isSplashComplete && (
        <SplashScreen onFinish={() => setIsSplashComplete(true)} />
      )}

      {/* Main App / Login UI rendered after splash transition */}
      <main className="dinasari-app-container">
        <style>{`
          .dinasari-app-container {
            min-height: 100vh;
            background: linear-gradient(180deg, #f0f7f4 0%, #ffffff 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px 16px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #1e2d1a;
          }

          .dinasari-login-card {
            background: #ffffff;
            border-radius: 28px;
            box-shadow: 0 12px 36px rgba(46, 80, 36, 0.08);
            border: 1px solid #e1ebe0;
            padding: 36px 28px;
            max-width: 420px;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            animation: fadeInCard 0.6s ease-out;
          }

          .dinasari-card-title {
            font-size: 24px;
            font-weight: 800;
            color: #1b4314;
            margin-bottom: 8px;
            text-align: center;
          }

          .dinasari-card-sub {
            font-size: 14px;
            color: #5c6b57;
            text-align: center;
            margin-bottom: 28px;
            line-height: 1.5;
          }

          .dinasari-input-box {
            width: 100%;
            display: flex;
            align-items: center;
            background: #f6f8f5;
            border: 1.5px solid #d5e0d2;
            border-radius: 16px;
            padding: 12px 16px;
            margin-bottom: 20px;
            transition: border-color 0.2s;
          }

          .dinasari-input-box:focus-within {
            border-color: #488f28;
            background: #ffffff;
          }

          .dinasari-input-prefix {
            font-size: 15px;
            font-weight: 700;
            color: #2f5d34;
            margin-right: 12px;
            padding-right: 12px;
            border-right: 1px solid #d5e0d2;
          }

          .dinasari-input-field {
            border: none;
            outline: none;
            background: transparent;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 1px;
            width: 100%;
            color: #1a2e18;
          }

          .dinasari-btn-submit {
            width: 100%;
            padding: 15px;
            background: linear-gradient(90deg, #1b4314 0%, #488f28 100%);
            color: #ffffff;
            border: none;
            border-radius: 9999px;
            font-size: 16px;
            font-weight: 700;
            letter-spacing: 0.5px;
            cursor: pointer;
            box-shadow: 0 6px 18px rgba(35, 78, 22, 0.25);
            transition: transform 0.15s ease, box-shadow 0.15s ease;
          }

          .dinasari-btn-submit:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 22px rgba(35, 78, 22, 0.35);
          }

          .dinasari-btn-replay {
            margin-top: 24px;
            background: transparent;
            border: 1px dashed #7ea376;
            color: #3b6e22;
            padding: 8px 16px;
            border-radius: 9999px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
          }

          .dinasari-btn-replay:hover {
            background: #eef5ea;
          }

          @keyframes fadeInCard {
            from {
              opacity: 0;
              transform: translateY(16px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>

        <div className="dinasari-login-card">
          <h2 className="dinasari-card-title">🌾 DINASARI</h2>
          <p className="dinasari-card-sub">
            Connect • Collaborate • Cultivate<br />
            Enter your mobile number to get started
          </p>

          <div className="dinasari-input-box">
            <span className="dinasari-input-prefix">+91</span>
            <input
              type="tel"
              maxLength={10}
              placeholder="Enter 10-digit number"
              className="dinasari-input-field"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          <button
            className="dinasari-btn-submit"
            onClick={() => alert(`Sending OTP to +91 ${phoneNumber || '9876543210'}`)}
          >
            Send OTP
          </button>

          <button
            className="dinasari-btn-replay"
            onClick={() => setIsSplashComplete(false)}
          >
            🔄 Replay Splash Animation
          </button>
        </div>
      </main>
    </>
  );
}
