const Header = () => {
  return (
    <header className="bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-brand-primary align-middle">
<path d="M24 2L2 15V33L24 46L46 33V15L24 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
<path d="M24 15L12 22L12 30L24 37L36 30L36 22L24 15Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M16 19L16 29" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
<path d="M32 19L32 29" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
<path d="M16 24H32" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
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
