import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Usuário ou senha incorretos.");
      setLoading(false);
    } else {
      router.push("/");
    }
  };

  return (
    <>
      <Head>
        <title>PhronexSec | Portal do Cliente</title>
        <link rel="icon" href="/phronexsec-logo.png" />
      </Head>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #02060c;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        canvas#particles {
          position: fixed;
          top: 0; left: 0;
          z-index: 0;
          pointer-events: none;
        }

        .login-wrap {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          padding: 24px;
        }

        .login-card {
          background: linear-gradient(145deg, #0a1223, #060e1c);
          border: 1px solid rgba(0, 118, 245, 0.28);
          border-radius: 24px;
          padding: 52px 44px 48px;
          text-align: center;
          box-shadow:
            0 40px 80px -20px rgba(0,0,0,0.8),
            0 0 80px rgba(0,118,245,0.06),
            inset 0 1px 0 rgba(255,255,255,0.04);
        }

        .logo-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 28px;
        }

        .logo-wrap img {
          height: 48px;
          width: auto;
          filter:
            drop-shadow(0 0 10px rgba(0,118,245,0.9))
            drop-shadow(0 0 30px rgba(0,118,245,0.5));
        }

        .logo-text {
          text-align: left;
        }

        .logo-name {
          font-size: 1.1rem;
          font-weight: 700;
          color: #e2e8f0;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .logo-sub {
          font-size: 0.6rem;
          font-family: 'JetBrains Mono', monospace;
          color: #3b82f6;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,118,245,0.3), transparent);
          margin-bottom: 28px;
        }

        .login-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 6px;
          letter-spacing: -0.02em;
        }

        .login-sub {
          font-size: 0.78rem;
          color: #475569;
          font-weight: 300;
          margin-bottom: 28px;
        }

        .input-group {
          margin-bottom: 12px;
          text-align: left;
        }

        .input-label {
          display: block;
          font-size: 0.7rem;
          font-family: 'JetBrains Mono', monospace;
          color: #475569;
          letter-spacing: 0.06em;
          margin-bottom: 6px;
          text-transform: uppercase;
        }

        .input-field {
          width: 100%;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid #1e293b;
          border-radius: 10px;
          padding: 13px 16px;
          color: #e2e8f0;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.25s, box-shadow 0.25s;
          font-family: inherit;
        }

        .input-field:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
        }

        .input-field::placeholder {
          color: #334155;
        }

        .error-msg {
          font-size: 0.75rem;
          font-family: 'JetBrains Mono', monospace;
          color: #f87171;
          margin-bottom: 12px;
          text-align: left;
          display: ${error ? 'block' : 'none'};
        }

        .submit-btn {
          width: 100%;
          padding: 14px;
          background: #0076f5;
          color: #fff;
          font-weight: 600;
          font-size: 0.92rem;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.25s;
          font-family: inherit;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 8px 28px rgba(0,118,245,0.35);
          margin-top: 8px;
        }

        .submit-btn:hover:not(:disabled) {
          background: #1a8aff;
          box-shadow: 0 12px 36px rgba(0,118,245,0.5);
          transform: translateY(-1px);
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .footer-text {
          margin-top: 24px;
          font-size: 0.68rem;
          font-family: 'JetBrains Mono', monospace;
          color: #1e293b;
        }

        @media (max-width: 480px) {
          .login-card { padding: 36px 24px; }
        }
      `}</style>

      <canvas id="particles"></canvas>

      <div className="login-wrap">
        <div className="login-card">

          {/* Logo */}
          <div className="logo-wrap">
            <img src="/phronexsec-logo.png" alt="PhronexSec" />
            <div className="logo-text">
              <div className="logo-name">PhronexSec</div>
              <div className="logo-sub">Portal do Cliente</div>
            </div>
          </div>

          <div className="divider"></div>

          <p className="login-title">Acesso ao Suporte</p>
          <p className="login-sub">Entre com suas credenciais</p>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Senha</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && <p className="error-msg">{error}</p>}

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (
                <div className="spinner"></div>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Entrar
                </>
              )}
            </button>
          </form>

          <p className="footer-text">© 2026 PhronexSec Cybersecurity</p>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{__html: `
        (function(){
          const c = document.getElementById('particles');
          if (!c) return;
          const ctx = c.getContext('2d');
          let W, H;
          const pts = Array.from({length: 80}, () => ({
            x: Math.random()*9999, y: Math.random()*9999,
            vx: (Math.random()-.5)*.25, vy: (Math.random()-.5)*.25,
            r: Math.random()*1.4+.3, a: Math.random()*.35+.08
          }));
          function resize(){ W=c.width=innerWidth; H=c.height=innerHeight; }
          resize();
          window.addEventListener('resize', resize);
          (function draw(){
            ctx.clearRect(0,0,W,H);
            pts.forEach(p=>{
              p.x+=p.vx; p.y+=p.vy;
              if(p.x<0||p.x>W) p.vx*=-1;
              if(p.y<0||p.y>H) p.vy*=-1;
              ctx.beginPath();
              ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
              ctx.fillStyle='rgba(0,118,245,'+p.a+')';
              ctx.fill();
            });
            requestAnimationFrame(draw);
          })();
        })();
      `}} />
    </>
  );
}
