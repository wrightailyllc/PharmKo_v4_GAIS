import React from 'react';
import { Link } from 'react-router-dom';
import { SEOHead } from '../components/SEOHead';

export const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 py-12 px-4">
      <SEOHead
        title="Terms of Service | PharmKo"
        description="PharmKo terms of service - usage terms, medical disclaimer, and legal information."
        path="/terms"
      />
      <div className="max-w-4xl mx-auto">
        <Link
          to="/"
          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2 mb-6"
        >
          ← Back
        </Link>

        <article className="space-y-8">
          <header>
            <h1 className="text-4xl font-bold text-white mb-2">Terms of Service</h1>
            <p className="text-gray-400">Effective Date: March 12, 2026</p>
          </header>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. ACCEPTANCE OF TERMS</h2>
            <p className="text-gray-300 mb-4">
              By accessing or using the PharmKo application, website, and services (collectively, the "Service") operated by WrightAI, LLC., d/b/a PharmKo ("Company", "we", "us", or "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service.
            </p>
          </section>

          <section className="bg-red-900/20 border border-red-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-red-400 mb-4">2. MEDICAL DISCLAIMER</h2>
            <p className="text-gray-300 mb-4">
              <strong className="text-red-300">IMPORTANT: PharmKo is for informational purposes only.</strong> The Service does not provide medical advice, diagnosis, or treatment recommendations. The information provided through PharmKo, including drug safety reports, adverse event data, interaction analysis, and harm scores, is intended for general educational and informational purposes only.
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4 mb-4">
              <li>The Service is <strong>not a substitute</strong> for professional medical advice, diagnosis, or treatment.</li>
              <li><strong>Always seek the advice</strong> of your physician or other qualified health provider with any questions you may have regarding a medical condition or medication.</li>
              <li><strong>Never disregard professional medical advice</strong> or delay in seeking it because of information obtained through this Service.</li>
              <li>If you think you may have a medical emergency, <strong>call your doctor or 911 immediately</strong>.</li>
              <li>PharmKo does not recommend or endorse any specific tests, physicians, products, procedures, opinions, or other information that may be mentioned through the Service.</li>
            </ul>
            <p className="text-gray-300">
              Reliance on any information provided by PharmKo, its employees, contracted writers, or medical professionals presenting content for publication is solely at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. DESCRIPTION OF SERVICE</h2>
            <p className="text-gray-300 mb-4">
              PharmKo provides AI-powered pharmacological intelligence by aggregating and analyzing publicly available drug safety data from sources including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4 mb-4">
              <li>U.S. Food and Drug Administration (FDA) drug labels and adverse event reports (FAERS)</li>
              <li>National Library of Medicine (PubMed) and Europe PMC research articles</li>
              <li>ClinicalTrials.gov clinical trial data</li>
              <li>RxNorm drug identification data</li>
            </ul>
            <p className="text-gray-300">
              The Service uses artificial intelligence (Google Gemini) to synthesize this data into safety reports. These reports reflect publicly available data and AI-generated analysis, which may contain inaccuracies or omissions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. USER ACCOUNTS</h2>
            <p className="text-gray-300 mb-4">
              To access certain features, you may be required to create an account. You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly update your information if it changes</li>
              <li>Accept responsibility for all activities that occur under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. ACCEPTABLE USE</h2>
            <p className="text-gray-300 mb-4">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to reverse engineer, decompile, or extract the proprietary scoring algorithms</li>
              <li>Scrape, crawl, or use automated means to access the Service beyond normal use</li>
              <li>Redistribute, resell, or commercially exploit reports generated by the Service without written permission</li>
              <li>Use the Service to provide medical advice to others</li>
              <li>Interfere with or disrupt the Service or servers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. INTELLECTUAL PROPERTY</h2>
            <p className="text-gray-300 mb-4">
              The Service, including its proprietary harm scoring algorithms, confidence metrics, safety trend indicators, user interface design, and all related intellectual property, is owned by WrightAI, LLC. The underlying data sources (FDA, PubMed, ClinicalTrials.gov) are publicly available; however, PharmKo's analysis, scoring methodologies, and presentation are proprietary.
            </p>
            <p className="text-gray-300">
              You are granted a limited, non-exclusive, non-transferable license to use the Service for personal, non-commercial purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. HEALTH DATA HANDLING</h2>
            <p className="text-gray-300 mb-4">
              PharmKo may collect health-related information you voluntarily provide, such as current medications in your user profile. This information is used solely to enhance your experience and is handled in accordance with our <Link to="/privacy" className="text-indigo-400 hover:underline">Privacy Policy</Link>.
            </p>
            <p className="text-gray-300">
              PharmKo is not a covered entity under HIPAA. We do not access, store, or process Protected Health Information (PHI) from healthcare providers or insurance companies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. THIRD-PARTY SERVICES AND DATA</h2>
            <p className="text-gray-300 mb-4">
              The Service relies on data from third-party sources. We do not guarantee the accuracy, completeness, or timeliness of third-party data. The availability of third-party APIs may affect Service functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. SUBSCRIPTION AND PAYMENT TERMS</h2>
            <p className="text-gray-300 mb-4">
              Certain premium features may require a paid subscription. By subscribing, you agree to the applicable pricing, billing frequency, and payment terms presented at the time of purchase. Subscriptions may be managed through your account settings or the applicable app store.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. LIMITATION OF LIABILITY</h2>
            <p className="text-gray-300 mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WRIGHTAI, LLC. SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE.
            </p>
            <p className="text-gray-300">
              IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. INDEMNIFICATION</h2>
            <p className="text-gray-300">
              You agree to indemnify and hold harmless WrightAI, LLC., its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising out of your use of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. TERMINATION</h2>
            <p className="text-gray-300">
              We may suspend or terminate your access to the Service at any time, with or without cause, with or without notice. Upon termination, your right to use the Service will immediately cease. You may delete your account at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">13. GOVERNING LAW</h2>
            <p className="text-gray-300">
              These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">14. CHANGES TO TERMS</h2>
            <p className="text-gray-300">
              We reserve the right to modify these Terms at any time. We will notify users of material changes by updating the effective date and, where appropriate, through in-app notifications. Continued use of the Service after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">15. CONTACT US</h2>
            <div className="bg-gray-800 p-4 rounded-md">
              <p className="text-gray-300"><strong>WrightAI, LLC. (PharmKo)</strong></p>
              <p className="text-gray-300">Email: legal@pharmko.app</p>
              <p className="text-gray-300 text-sm mt-4">These terms of service were last updated on March 12, 2026.</p>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
};
