import { Link } from "react-router-dom";

export function Home() {
  return (
    <div className="home-container">
      <div className="hero-section" style={{
        backgroundImage: "url('/hero-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        borderRadius: "24px",
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Dark overlay for readability */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(11, 14, 20, 0.4), rgba(11, 14, 20, 0.8))"
        }}></div>
        
        <div className="glass-panel" style={{
          position: "relative",
          padding: "48px",
          borderRadius: "24px",
          textAlign: "center",
          maxWidth: "600px",
          zIndex: 1
        }}>
          <h1 style={{ 
            fontSize: "48px", 
            margin: "0 0 16px 0",
            background: "linear-gradient(to right, #F8F9FA, #D4AF37)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            Welcome to the VIP Room
          </h1>
          <p style={{ 
            fontSize: "18px", 
            opacity: 0.8,
            marginBottom: "32px",
            lineHeight: 1.6
          }}>
            Experience hyper-realistic Blackjack gameplay with advanced training tools. Sit down at the table and test your skills.
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
            <Link to="/play" style={{
              background: "#D4AF37",
              color: "#0B0E14",
              padding: "16px 32px",
              borderRadius: "12px",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "18px",
              boxShadow: "0 4px 15px rgba(212, 175, 55, 0.3)"
            }}>
              Join Table
            </Link>
            <Link to="/training" style={{
              background: "rgba(255,255,255,0.1)",
              color: "#F8F9FA",
              padding: "16px 32px",
              borderRadius: "12px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "18px",
              border: "1px solid rgba(255,255,255,0.2)"
            }}>
              Training Mode
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
