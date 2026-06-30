import { Link } from 'react-router-dom';
import { Shield, Heart, Mail } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-zinc-200 text-zinc-550 py-12 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-zinc-200">
          
          {/* Brand Info */}
          <div className="space-y-4 text-left">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="bg-zinc-950 p-1.5 rounded-xl group-hover:bg-zinc-800 transition-all">
                <Shield className="h-4.5 w-4.5 text-white fill-white" />
              </div>
              <span className="text-base font-extrabold text-zinc-950 tracking-tight font-display">
                Community Hero
              </span>
            </Link>
            <p className="text-xs sm:text-sm leading-relaxed text-zinc-500">
              Empowering citizens to report issues, collaborate with local leaders, and build safer, cleaner, and better neighborhoods together.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4 md:pl-12 text-left">
            <h3 className="text-xs font-bold text-zinc-900 tracking-wider uppercase font-display">
              Quick Links
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <Link to="/" className="hover:text-zinc-900 transition-colors font-medium">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/report" className="hover:text-zinc-900 transition-colors font-medium">
                  Report Problem
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-zinc-900 transition-colors font-medium">
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Socials */}
          <div className="space-y-4 text-left">
            <h3 className="text-xs font-bold text-zinc-900 tracking-wider uppercase font-display">
              Get Connected
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500">
              Want to partner with your municipality or school? Get in touch.
            </p>
            <div className="flex space-x-3">
              <a href="#" className="p-2 bg-zinc-100 hover:bg-zinc-200 rounded-full text-zinc-700 hover:text-zinc-950 transition-colors" aria-label="X (formerly Twitter)">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="#" className="p-2 bg-zinc-100 hover:bg-zinc-200 rounded-full text-zinc-700 hover:text-zinc-950 transition-colors" aria-label="GitHub">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="mailto:support@communityhero.org" className="p-2 bg-zinc-100 hover:bg-zinc-200 rounded-full text-zinc-700 hover:text-zinc-950 transition-colors" aria-label="Email">
                <Mail className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Section */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs space-y-4 sm:space-y-0">
          <p>&copy; {currentYear} Community Hero. All rights reserved.</p>
          <p className="flex items-center space-x-1.5">
            <span>Made with</span>
            <Heart className="h-3.5 w-3.5 text-zinc-900 fill-zinc-900" />
            <span>for communities everywhere.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
