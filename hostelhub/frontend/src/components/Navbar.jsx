import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Tag,
  MessageCircle,
  Heart,
  ShieldCheck,
  UserRound,
  LogIn,
  UserPlus,
  LogOut,
  Menu,
  Leaf,
  X,
  Bell
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import useUnreadMessages from "../hooks/useUnreadMessages";
import useUnreadNotifications from "../hooks/useUnreadNotifications";

import "./Navbar.css";

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  const unread = useUnreadMessages();
  const unreadNotifications = useUnreadNotifications();

  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    setMenuOpen(false);
    navigate("/");
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  const unreadLabel = unread > 9 ? "9+" : String(unread);

  const notificationLabel =
    unreadNotifications > 9
      ? "9+"
      : String(unreadNotifications);

  return (
    <header className="navbar">
      <div className="container navbar-inner">

        {/* LOGO */}
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          <span className="navbar-logo-icon">
            <ShoppingCart size={21} />
          </span>
          Hostel<span>Hub</span>
        </Link>

        {/* DESKTOP NAVIGATION */}
        <nav className="navbar-links" aria-label="Primary">
          <Link to="/marketplace">
            <ShoppingCart size={17} />
            Marketplace
          </Link>

          <Link to="/add-product">
            <Tag size={17} />
            Sell an Item
          </Link>
        </nav>

        {/* DESKTOP ACTIONS */}
        <div className="navbar-actions">
          {isAuthenticated ? (
            <>
              {/* MESSAGES */}
              <Link
                to="/inbox"
                className="navbar-icon-link"
                aria-label={
                  unread
                    ? `Messages, ${unread} unread`
                    : "Messages"
                }
              >
                <MessageCircle size={18} />
                <span>Messages</span>

                {unread > 0 && (
                  <span className="navbar-badge">
                    {unreadLabel}
                  </span>
                )}
              </Link>

              {/* NOTIFICATIONS */}
              <Link
                to="/notifications"
                className="navbar-icon-link notification-nav-link"
                aria-label={
                  unreadNotifications
                    ? `${unreadNotifications} unread notifications`
                    : "Notifications"
                }
              >
                <Bell size={18} />
                <span>Notifications</span>

                {unreadNotifications > 0 && (
                  <span className="navbar-badge">
                    {notificationLabel}
                  </span>
                )}
              </Link>

              {/* SAVED */}
              <Link to="/saved" className="navbar-icon-link">
                <Heart size={18} />
                <span>Saved</span>
              </Link>

              {/* IMPACT */}
              <Link to="/impact" className="navbar-icon-link">
                <Leaf size={18} />
                <span>Impact Dashboard</span>
              </Link>

              {/* ADMIN */}
              {user?.is_admin && (
                <Link to="/admin" className="navbar-icon-link">
                  <ShieldCheck size={18} />
                  <span>Admin</span>
                </Link>
              )}

              {/* PROFILE */}
              <Link to="/profile" className="navbar-icon-link">
                <UserRound size={18} />
                <span>
                  {user?.name?.split(" ")[0] || "Profile"}
                </span>
              </Link>

              {/* LOGOUT */}
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                <LogIn size={17} />
                Login
              </Link>

              <Link
                to="/register"
                className="btn btn-primary btn-sm"
              >
                <UserPlus size={17} />
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          type="button"
          className="navbar-menu-toggle"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>

      {/* MOBILE NAVIGATION */}
      {menuOpen && (
        <div className="navbar-mobile">

          <Link to="/marketplace" onClick={closeMenu}>
            <ShoppingCart size={18} />
            Marketplace
          </Link>

          <Link to="/add-product" onClick={closeMenu}>
            <Tag size={18} />
            Sell an Item
          </Link>

          {isAuthenticated ? (
            <>
              <Link to="/inbox" onClick={closeMenu}>
                <MessageCircle size={18} />
                Messages

                {unread > 0 && (
                  <span className="navbar-badge">
                    {unreadLabel}
                  </span>
                )}
              </Link>

              <Link to="/notifications" onClick={closeMenu}>
                <Bell size={18} />
                Notifications

                {unreadNotifications > 0 && (
                  <span className="navbar-badge">
                    {notificationLabel}
                  </span>
                )}
              </Link>

              <Link to="/saved" onClick={closeMenu}>
                <Heart size={18} />
                Saved
              </Link>

              <Link to="/impact" onClick={closeMenu}>
                <Leaf size={18} />
                Impact Dashboard
              </Link>

              {user?.is_admin && (
                <Link to="/admin" onClick={closeMenu}>
                  <ShieldCheck size={18} />
                  Admin
                </Link>
              )}

              <Link to="/profile" onClick={closeMenu}>
                <UserRound size={18} />
                Profile
              </Link>

              <button
                className="btn btn-secondary btn-block"
                onClick={handleLogout}
              >
                <LogOut size={17} />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={closeMenu}>
                <LogIn size={18} />
                Login
              </Link>

              <Link
                to="/register"
                className="btn btn-primary btn-block"
                onClick={closeMenu}
              >
                <UserPlus size={18} />
                Get Started
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}