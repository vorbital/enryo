const Header = () => {
  return (
    <header className="bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <svg
            className="w-8 h-8 text-brand-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            ></path>
          </svg>
          <span className="text-2xl text-white">Enryo</span>
        </div>
        <div className="flex items-center space-x-4">
          <a href="#features" className="text-gray-300 hover:text-brand-primary">
            Features
          </a>
          <a href="#" className="text-gray-300 hover:text-brand-primary">
            About
          </a>
          <button className="bg-brand-primary text-white font-light px-3 py-1 border border-brand-primary/50 button-clip hover:bg-brand-primary-dark transition">
            Join Waitlist
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Header;
