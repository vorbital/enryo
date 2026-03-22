const Hero = () => {
  return (
    <section className="relative text-white py-32 text-center">
      <div className="absolute top-0 left-0 w-full h-full bg-gray-900 opacity-50"></div>
      <div className="container mx-auto px-6 relative">
        <h1 className="text-5xl md:text-7xl tracking-tight text-shadow-glow">
          Enryo: The Mindful Workspace
        </h1>
        <p className="mt-4 text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
          Experience communication designed for deep work, not distraction. Enryo respects your boundaries, anticipates your needs, and fosters truly thoughtful collaboration.
        </p>
        <div className="mt-8">
          <button className="bg-brand-primary text-white font-light px-6 py-3 border border-brand-primary/50 button-clip shadow-lg hover:bg-brand-primary-dark transform hover:scale-105 transition-transform duration-300">
            Request a Demo
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
