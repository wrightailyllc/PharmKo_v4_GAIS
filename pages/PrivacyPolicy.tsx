import React from 'react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={onBack}
          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2 mb-6"
        >
          ← Back
        </button>

        <article className="space-y-8">
          <header>
            <h1 className="text-4xl font-bold text-white mb-2">PharmKo Privacy Policy</h1>
            <p className="text-gray-400">Effective Date: November 28, 2025</p>
          </header>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. INTRODUCTION</h2>
            <p className="text-gray-300 mb-4">
              At WrightAI, LLC., d/b/a PharmKo ("us", "we", "our" or the "Company"), we value your privacy and the importance of safeguarding your data. This Privacy Policy (the "Policy") describes our privacy practices for the activities set out below. Personal data ("Personal Data") refers to any information that, on its own, or in combination with other available information, can identify an individual.
            </p>
            <p className="text-gray-300 mb-4">
              We are committed to protecting your privacy in accordance with the highest level of privacy regulation. As such, we follow the obligations under the following regulations:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li>Canada's Personal Information Protection and Electronic Documents Act (PIPEDA)</li>
              <li>Quebec Law 25</li>
              <li>The EU's General Data Protection Regulation (GDPR)</li>
              <li>Brazil's Data Protection Legislation (LGPD)</li>
              <li>California's Consumer Privacy Act (CCPA) / California Privacy Rights Act (CPRA)</li>
              <li>Colorado Privacy Act (CPA), Utah Consumer Privacy Act (UCPA), Connecticut Data Privacy Act (CTDPA)</li>
              <li>Virginia Consumer Data Protection Act (VCDPA)</li>
              <li>Texas Data Privacy and Security Act (TDPSA) and other US state privacy laws</li>
              <li>South Africa's Protection of Personal Information Act (POPIA)</li>
              <li>Switzerland's Federal Act on Data Protection (FADP)</li>
              <li>Saudi Arabia's Personal Data Protection Law (PDPL)</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-bold text-white mb-3">Scope</h3>
            <p className="text-gray-300 mb-4">
              This policy applies to the WrightAI, LLC. websites, domains, applications, services, and products. This Policy does not apply to third-party applications, websites, products, services or platforms that may be accessed through links we may provide. These sites are owned and operated independently from us with their own privacy practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. PERSONAL DATA WE COLLECT</h2>
            
            <h3 className="text-xl font-bold text-white mb-3">When You Make a Purchase or Use Our Services</h3>
            <p className="text-gray-300 mb-3">We collect the following types of Personal Data:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4 mb-4">
              <li>Account Information: name, email address, password</li>
              <li>Payment Information: billing address, phone number, credit/debit card, payment methods</li>
              <li>Financial Information: credit card numbers</li>
              <li>Purchase Information</li>
              <li>Mobile device identifiers: make, model, IMEI, phone number</li>
              <li>Location Data</li>
              <li>Feedback: customer support inquiries, product reviews</li>
              <li>Social Media Information</li>
              <li>Product Information: serial numbers, registration, licensing</li>
            </ul>

            <h3 className="text-xl font-bold text-white mb-3">How We Collect Your Data</h3>
            <p className="text-gray-300 mb-3"><strong>From You:</strong> When you create an account, purchase products, use our services, create content, download software, subscribe to newsletters, complete surveys, or contact us.</p>
            <p className="text-gray-300 mb-3"><strong>Automated Technologies:</strong> We collect Device Data, Usage Data, and Contact Data through cookies, server logs, and similar technologies.</p>
            <p className="text-gray-300"><strong>From Third Parties:</strong> Analytics providers, social media platforms, payment processors, and other service providers.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. PURPOSE AND LEGAL BASIS FOR DATA PROCESSING</h2>
            <p className="text-gray-300 mb-4">We collect and use your Personal Data to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4 mb-4">
              <li>Deliver your products and services</li>
              <li>Fulfill orders and shipments</li>
              <li>Build a safe and secure environment</li>
              <li>Verify and authenticate your identity</li>
              <li>Investigate and prevent security incidents</li>
              <li>Deliver, maintain, debug and improve our products and services</li>
              <li>Provide technical and customer support</li>
              <li>Send marketing communications and newsletters</li>
              <li>Conduct research and development</li>
            </ul>
            <p className="text-gray-300">These purposes are necessary either to perform our contractual obligations to you or are in our legitimate interests to provide quality services.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. THIRD PARTY TOOLS</h2>
            <p className="text-gray-300 mb-3">We use the following third-party tools to store and manage your information:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li>Shopify - e-commerce platform</li>
              <li>Hubspot - CRM and marketing automation</li>
              <li>Intercom - customer communication</li>
              <li>Segment - data collection and analytics</li>
              <li>Stripe - payment processing</li>
              <li>Google Cloud - storage and database services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. INTERNATIONAL DATA TRANSFER</h2>
            <p className="text-gray-300 mb-4">
              Where possible, we store and process data on servers within your general geographical region. Your Personal Data may be transferred to servers outside your jurisdiction where data protection laws may differ. We take appropriate steps to ensure your Personal Data is treated securely and in accordance with this Policy and applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. YOUR RIGHTS</h2>
            <p className="text-gray-300 mb-4">
              Depending on your location, you may have rights to access, correct, delete, or port your Personal Data. To exercise these rights, please contact us using the information below.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. CONTACT US</h2>
            <p className="text-gray-300 mb-4">
              If you have questions about this Privacy Policy or our privacy practices, please contact our Data Protection Officer:
            </p>
            <div className="bg-gray-800 p-4 rounded-md">
              <p className="text-gray-300"><strong>WrightAI, LLC. (PharmKo)</strong></p>
              <p className="text-gray-300">Email: privacy@pharmko.app</p>
              <p className="text-gray-300 text-sm mt-4">This privacy policy was last updated on November 28, 2025.</p>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
};
