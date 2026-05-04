import React from 'react';
import { Link } from 'react-router-dom';
import { SEOHead } from '../components/SEOHead';
import { BeakerIcon } from '../components/icons/BeakerIcon';
import { ShieldExclamationIcon } from '../components/icons/ShieldExclamationIcon';
import { DocumentTextIcon } from '../components/icons/DocumentTextIcon';
import { PillIcon } from '../components/icons/PillIcon';

const DataSourceCard: React.FC<{ icon: React.ReactNode; name: string; description: string }> = ({ icon, name, description }) => (
  <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700">
    <div className="flex items-center gap-3 mb-2">
      <div className="text-indigo-400 h-6 w-6">{icon}</div>
      <h3 className="text-lg font-semibold text-white">{name}</h3>
    </div>
    <p className="text-gray-400 text-sm">{description}</p>
  </div>
);

export const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 py-12 px-4">
      <SEOHead
        title="About PharmKo - AI-Powered Drug Safety Intelligence"
        description="Learn how PharmKo uses AI to analyze FDA data, clinical trials, and medical research to provide drug safety intelligence."
        path="/about"
      />
      <div className="max-w-4xl mx-auto">
        <Link
          to="/"
          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2 mb-6"
        >
          ← Back
        </Link>

        <article className="space-y-10">
          <header>
            <h1 className="text-4xl font-bold text-white mb-4">About PharmKo</h1>
            <p className="text-xl text-gray-300">
              AI-powered pharmacological intelligence for informed health decisions.
            </p>
          </header>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
            <p className="text-gray-300 mb-4">
              PharmKo is built by WrightAI, LLC. with a mission to democratize access to drug safety information. We believe everyone deserves transparent, easy-to-understand insights about the medications they take.
            </p>
            <p className="text-gray-300">
              Using artificial intelligence and publicly available data from trusted sources, PharmKo provides comprehensive drug safety reports that synthesize information from across the pharmacovigilance landscape.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">How It Works</h2>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">1</div>
                <div>
                  <h3 className="font-semibold text-white">Search for a Drug</h3>
                  <p className="text-gray-400">Enter any medication name and PharmKo identifies it using the RxNorm drug database.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">2</div>
                <div>
                  <h3 className="font-semibold text-white">Data Collection</h3>
                  <p className="text-gray-400">We query FDA drug labels, adverse event reports (FAERS), clinical trials, and medical journal databases simultaneously.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">3</div>
                <div>
                  <h3 className="font-semibold text-white">AI Analysis</h3>
                  <p className="text-gray-400">Google Gemini AI synthesizes the collected data into a comprehensive safety report with a proprietary harm score.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">4</div>
                <div>
                  <h3 className="font-semibold text-white">Review Your Report</h3>
                  <p className="text-gray-400">Get a detailed breakdown including harm score, adverse events, drug interactions, clinical trial data, and journal findings.</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Our Data Sources</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DataSourceCard
                icon={<PillIcon />}
                name="FDA OpenFDA"
                description="Drug labels, black box warnings, and the FDA Adverse Event Reporting System (FAERS) with millions of reported events."
              />
              <DataSourceCard
                icon={<BeakerIcon />}
                name="PubMed / Europe PMC"
                description="Peer-reviewed medical journal articles and research papers on drug safety and efficacy."
              />
              <DataSourceCard
                icon={<DocumentTextIcon />}
                name="ClinicalTrials.gov"
                description="Clinical trial data including phases, conditions studied, and outcomes for drugs under investigation."
              />
              <DataSourceCard
                icon={<ShieldExclamationIcon />}
                name="RxNorm"
                description="National Library of Medicine's standardized drug naming system for accurate drug identification."
              />
            </div>
          </section>

          <section className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-yellow-400 mb-2">Important Note</h2>
            <p className="text-gray-300">
              PharmKo is for informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult your healthcare provider before making decisions about your medications.
            </p>
          </section>

          <section className="flex gap-4">
            <Link to="/privacy" className="text-indigo-400 hover:underline">Privacy Policy</Link>
            <Link to="/terms" className="text-indigo-400 hover:underline">Terms of Service</Link>
          </section>
        </article>
      </div>
    </div>
  );
};
