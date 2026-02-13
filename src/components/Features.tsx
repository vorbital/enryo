const features = [
  {
    name: 'Mindful AI Collaboration',
    description: 'Experience intelligent filtering and non-intrusive notifications, fostering focused dialogues that respect individual concentration and boundaries.',
  },
  {
    name: 'Context-Aware Automation',
    description: 'Enryo anticipates needs and suggests actions without interrupting your flow, ensuring automation enhances, rather than dictates, your workday.',
  },
  {
    name: 'Fortress-Grade Security with SCIM',
    description: 'Integrate seamlessly with your identity provider. Advanced security and compliance features are built in, ensuring trust and privacy without imposing complexity.',
  },
];

const Features = () => {
  return (
    <section id="features" className="py-20 bg-gray-900">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl text-white">An entirely new way to work</h2>
          <p className="mt-4 text-lg text-gray-400">The power of a large language model in every conversation.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <div key={feature.name} className={`feature-card clip-corner-br bg-gray-800/50 p-5 border border-gray-700 shadow-lg ${
              index === 0
                ? 'border-b-4 border-brand-primary' // Thicker bottom border for first card
                : index === 2
                ? 'border-r-4 border-brand-primary' // Thicker right border for third card
                : '' // No special border for the middle card
            }`}
                 style={{ boxShadow: `0 0 15px ${index === 0 || index === 2 ? 'rgba(34, 211, 238, 0.15)' : 'rgba(100, 100, 100, 0.05)'}` }}>
              <h3 className="text-2xl text-white">{feature.name}</h3>
              <p className="mt-4 text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
