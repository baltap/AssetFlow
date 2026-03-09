import { Clapperboard } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage() {
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
                    <h1 className="text-5xl font-black text-white uppercase tracking-tighter mb-4">Privacy Policy</h1>
                    <p className="text-[10px] text-[var(--primary)] font-bold uppercase tracking-[0.3em]">Last Updated: February 2026</p>
                </div>

                <div className="prose prose-invert prose-p:text-white/60 prose-headings:text-white prose-headings:uppercase prose-headings:tracking-tighter prose-headings:font-black prose-a:text-[var(--primary)] max-w-none">
                    <h2>1. Information We Collect</h2>
                    <p>
                        We collect information you provide directly to us when you create an account, such as your name, email address, and authentication credentials (handled securely via Clerk). We also collect the content you input into the Service, specifically your project titles, scripts, and visual instructions.
                    </p>

                    <h2>2. Third-Party API Keys</h2>
                    <p>
                        If you are an "Unleashed" tier user utilizing the Bring Your Own Keys (BYOK) feature, we securely store your API keys (e.g., ElevenLabs, Google Gemini) in our database. We only use these keys to authenticate requests made on your behalf to these specific third-party services. We never use your personal keys for system-wide operations or other users.
                    </p>

                    <h2>3. How We Use Your Information</h2>
                    <p>
                        We use the information we collect to provide, maintain, and improve the AssetFlow platform. Most notably, the textual scripts you enter are transmitted to third-party Large Language Model providers (like Google Gemini) to generate scene segments and search metadata.
                    </p>
                    <p>
                        <strong>We do not use your scripts or generated projects to train our own AI models.</strong> We rely on commercial API agreements with providers like Google, who generally restrict using API data to train their foundation models, but we advise you to review their specific privacy policies as well.
                    </p>

                    <h2>4. Data Storage and Security</h2>
                    <p>
                        Your data, including scripts and project structures, is stored using Convex, our backend database provider. We implement reasonable security measures to protect your information from unauthorized access or disclosure. However, no internet transmission or electronic storage method is 100% secure.
                    </p>

                    <h2>5. Third-Party Services</h2>
                    <p>
                        Our Service acts as a conduit to various third-party services:
                    </p>
                    <ul>
                        <li><strong>Authentication:</strong> We use Clerk.</li>
                        <li><strong>AI Processing:</strong> We use Google Gemini for text analysis.</li>
                        <li><strong>Voiceover Generation:</strong> We use ElevenLabs.</li>
                        <li><strong>Media Scouting:</strong> We query Pexels and Pixabay APIs.</li>
                        <li><strong>Analytics:</strong> We use PostHog to understand user behavior and improve the studio experience.</li>
                    </ul>
                    <p>
                        When you use AssetFlow, some of your data (like your script text or specific search queries) is sent to these services. Their use of this data is governed by their respective privacy policies.
                    </p>

                    <h2>6. Cookies and Tracking</h2>
                    <p>
                        We use cookies and similar tracking technologies to track activity on our Service and hold certain information, primarily for authentication and keeping you logged in securely.
                    </p>

                    <h2>7. Data Retention and Deletion</h2>
                    <p>
                        We retain your account information and project data for as long as your account is active. You may request the deletion of your account and all associated project data by contacting us. Upon request, we will permanently delete your database records.
                    </p>

                    <h2>8. Changes to this Privacy Policy</h2>
                    <p>
                        We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
                    </p>

                    <h2>9. Contact Us</h2>
                    <p>
                        If you have any questions about this Privacy Policy, please contact us at privacy@assetflow.studio.
                    </p>
                </div>
            </main>
        </div>
    );
}
