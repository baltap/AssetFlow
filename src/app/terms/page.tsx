import { Clapperboard } from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-[#12100a] text-[#d1d1d1] font-sans selection:bg-[var(--primary)] selection:text-black pb-32">
            {/* Header */}
            <header className="border-b border-white/5 bg-[#0a0905]/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group cursor-pointer hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(230,179,25,0.2)]">
                            <Clapperboard size={16} color="#12100a" />
                        </div>
                        <div className="text-xl font-black tracking-tighter text-[var(--primary)] uppercase">AssetFlow</div>
                    </Link>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 pt-24 space-y-16">
                <div>
                    <h1 className="text-5xl font-black text-white uppercase tracking-tighter mb-4">Terms of Service</h1>
                    <p className="text-[10px] text-[var(--primary)] font-bold uppercase tracking-[0.3em]">Last Updated: February 2026</p>
                </div>

                <div className="prose prose-invert prose-p:text-white/60 prose-headings:text-white prose-headings:uppercase prose-headings:tracking-tighter prose-headings:font-black prose-a:text-[var(--primary)] max-w-none">
                    <h2>1. Acceptance of Terms</h2>
                    <p>
                        By accessing and using AssetFlow ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service. We reserve the right to modify these terms at any time, and such modifications shall be effective immediately upon posting.
                    </p>

                    <h2>2. Description of Service</h2>
                    <p>
                        AssetFlow is an AI-powered cinematic pre-production tool that analyzes scripts, generates visual metadata, and acts as a specialized search engine for stock footage APIs (such as Pexels and Pixabay). We do not host, own, or license the stock footage found via our platform.
                    </p>

                    <h2>3. User Accounts and Credits</h2>
                    <p>
                        Access to certain features requires an account. You are responsible for maintaining the confidentiality of your account credentials. The Service operates on a credit-based system or subscription tiers. "Explorer" accounts receive a limited number of non-refreshing credits. "Director" accounts receive a monthly allotment. Unused credits may or may not roll over depending on your specific plan. All payments are non-refundable unless otherwise required by law.
                    </p>

                    <h2>4. API Usage and "Bring Your Own Keys" (BYOK)</h2>
                    <p>
                        Users on the "Unleashed" tier may provide their own API keys for third-party services (e.g., ElevenLabs, Google Gemini, Pexels). By providing your keys, you authorize AssetFlow to make requests to those services on your behalf. You are solely responsible for compliance with the terms of service of those third-party providers and any costs incurred on those platforms. AssetFlow is not liable for suspended keys or API overages on your external accounts.
                    </p>

                    <h2>5. Intellectual Property and Licensing</h2>
                    <p>
                        AssetFlow claims no ownership over the scripts you input into the system. The stock footage retrieved by AssetFlow is subject to the licenses of their respective platforms (e.g., Pexels License, Pixabay License). It is your responsibility to ensure your use of the generated media complies with those third-party licenses, especially regarding commercial use.
                    </p>

                    <h2>6. AI Generation Disclaimer</h2>
                    <p>
                        The Service utilizes generative AI models to parse scripts, suggest visual elements, and generate synthetic voiceovers. AI-generated content can be unpredictable. We do not guarantee the absolute accuracy, appropriateness, or quality of the AI's interpretations or the footage it selects. You are responsible for reviewing all generated content before using it in a final production.
                    </p>

                    <h2>7. Limitation of Liability</h2>
                    <p>
                        In no event shall AssetFlow, its directors, employees, or agents be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; or (iii) unauthorized access, use or alteration of your transmissions or content.
                    </p>

                    <h2>8. Termination</h2>
                    <p>
                        We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
                    </p>

                    <h2>9. Contact Us</h2>
                    <p>
                        If you have any questions about these Terms, please contact us at legal@assetflow.studio.
                    </p>
                </div>
            </main>
        </div>
    );
}
