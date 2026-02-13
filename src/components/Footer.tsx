const Footer = () => {
  return (
    <footer className="bg-gray-900 border-t border-brand-primary/10">
      <div className="container mx-auto px-6 py-8 flex justify-between items-center">
        <p className="text-gray-400">&copy; 2026 Enryo, Inc. All rights reserved.</p>
        <div className="flex space-x-4">
          <a href="#" className="text-gray-400 hover:text-white">Privacy</a>
          <a href="#" className="text-gray-400 hover:text-white">Terms</a>
          <a href="#" className="text-gray-400 hover:text-white">Contact</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
