import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">Hostel<span>Hub</span></span>
          <p>The marketplace built for your campus community.</p>
        </div>

        <div className="footer-links">
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/add-product">Sell an Item</Link>
          <Link to="/register">Get Started</Link>
        </div>

        <p className="footer-copy">© {new Date().getFullYear()} HostelHub. Built for students, by students.</p>
      </div>
    </footer>
  );
}
