import { Link, useLocation } from "react-router-dom";

const links = [
  { to: "/", label: "Gaze" },
  { to: "/dashboard", label: "Dashboard" },
];

export default function Nav() {
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6">
      <div className="flex items-center gap-8">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`font-mono text-xs uppercase tracking-[0.2em] transition-colors duration-300 ${
              location.pathname === link.to
                ? "text-flame"
                : "text-ash hover:text-bone"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <a
        href="https://github.com/subheeksh5599/Gaze"
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-xs uppercase tracking-[0.2em] text-ash hover:text-bone transition-colors duration-300"
      >
        GitHub ↗
      </a>
    </nav>
  );
}
