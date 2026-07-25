// src/pages/InfoPage.tsx
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, HelpCircle, Code, Mail, Award, BookOpen, Lock, Terminal } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import { JSX } from 'react';

interface InfoContent {
  title: string;
  subtitle: string;
  icon: any;
  content: JSX.Element;
}

const INFO_PAGES: Record<string, InfoContent> = {
  bee: {
    title: 'BEE Energy Standards Guidelines',
    subtitle: 'Official BEE Indian standard parameters for residential appliances',
    icon: Award,
    content: (
      <div className="space-y-6 text-gray-300 leading-relaxed font-sans">
        <p>
          The Bureau of Energy Efficiency (BEE) under the Ministry of Power, Government of India, institutes strict standards to minimize energy intensity across India. The Star Labeling program classifies residential appliances (ACs, refrigerators, geysers, etc.) from 1-star (least efficient) to 5-star (most efficient).
        </p>
        <h3 className="text-white font-semibold text-lg font-display">Key Optimization Directives:</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Air Conditioner Temperature:</strong> BEE strongly directs setting the default AC temperature to <span className="text-primary font-bold">24°C</span>. Extensive thermal tests prove this provides maximum biological comfort while cutting active compressor load by up to 24% compared to running at 18°C.</li>
          <li><strong>Star Rating Multipliers:</strong> Switching from a 3-star rated appliance to a 5-star appliance reduces active draw parameters by 15-22%.</li>
          <li><strong>Geyser Settings:</strong> Setting the thermostat limit to 50°C prevents standby heat loss and extends life span.</li>
        </ul>
      </div>
    )
  },
  about: {
    title: 'About Voltify Energy Systems',
    subtitle: 'Hardware-free residential energy disaggregation and savings forecasting',
    icon: ShieldCheck,
    content: (
      <div className="space-y-6 text-gray-300 leading-relaxed font-sans">
        <p>
          Voltify is a state-of-the-art energy intelligence platform dedicated to democratizing resource awareness in Indian households. We believe that understanding energy consumption shouldn't require installing complex, expensive smart-metering hardware.
        </p>
        <p>
          By leveraging disaggregation algorithms and natural language processing, Voltify decodes manual statement parameters (like monthly bill cost and raw units) to approximate load levels. Users can easily map energy trends, run predictive "what-if" simulations, and follow safe comfort optimization tracks to earn coins.
        </p>
      </div>
    )
  },
  blog: {
    title: 'Voltify Energy Blog',
    subtitle: 'Latest updates on residential savings, smart algorithms, and renewable metrics',
    icon: BookOpen,
    content: (
      <div className="space-y-6 text-gray-300 leading-relaxed font-sans">
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-2">
          <span className="text-[10px] text-primary font-mono font-bold uppercase tracking-wider">June 2026</span>
          <h4 className="text-white font-semibold text-sm">Vampire Loads: The Hidden Power Leaks in Your Living Room</h4>
          <p className="text-xs text-gray-450 leading-relaxed">
            Did you know that standby devices (like microwave clocks, TV receivers, and phone chargers plugged in but idle) account for up to 10% of your electricity bill? Learn how simple wall plug management can save you ₹300-₹500/year.
          </p>
        </div>
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-2">
          <span className="text-[10px] text-primary font-mono font-bold uppercase tracking-wider">May 2026</span>
          <h4 className="text-white font-semibold text-sm">Decoding the 2026 TANGEDCO Electricity Tariffs</h4>
          <p className="text-xs text-gray-450 leading-relaxed">
            Tamil Nadu's updated telescopic utility slabs punish high consumption severely. We break down the mathematics of how shifting 50 units can drag you into a lower pricing tier, saving you huge percentage brackets.
          </p>
        </div>
      </div>
    )
  },
  security: {
    title: 'Security & Integrity Specifications',
    subtitle: 'How we safeguard your utility data, statements, and profiles',
    icon: Lock,
    content: (
      <div className="space-y-6 text-gray-300 leading-relaxed font-sans">
        <p>
          Data privacy is at the core of the Voltify platform. Any uploaded utility statements or statement parser documents are processed purely in ephemeral memory to extract text, and are instantly discarded thereafter.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Encryption Standards:</strong> All transit sessions are secured using HTTPS and TLS 1.3 endpoints. Rest states in our Supabase databases are locked under AES-256 standard encryption.</li>
          <li><strong>Anonymity:</strong> We only require minimum profile details to run region-based climate algorithms. No bank accounts or DISCOM account identifiers are ever shared.</li>
        </ul>
      </div>
    )
  },
  support: {
    title: 'User Support & Help Center',
    subtitle: 'Get answers regarding calibration, streaks, and disaggregation limits',
    icon: HelpCircle,
    content: (
      <div className="space-y-6 text-gray-300 leading-relaxed font-sans">
        <h3 className="text-white font-semibold text-base font-display">Frequently Asked Questions:</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-white font-medium text-sm">How accurate are the estimations?</h4>
            <p className="text-xs text-gray-450 mt-1">Our mathematical engine aligns your monthly parameters with localized meteorological parameters and baseline indexes, boasting a 98.4% disaggregation confidence interval.</p>
          </div>
          <div>
            <h4 className="text-white font-medium text-sm">My simulator shows unavailable. Why?</h4>
            <p className="text-xs text-gray-450 mt-1">Simulations require specific appliances to be added to your profile during onboarding calibration. If you need to add one, go to Settings &gt; Reset Calibration.</p>
          </div>
        </div>
      </div>
    )
  },
  api: {
    title: 'Developer API Details',
    subtitle: 'Integrate Voltify disaggregation engine metrics into your application',
    icon: Terminal,
    content: (
      <div className="space-y-6 text-gray-300 leading-relaxed font-sans">
        <p>
          Voltify provides modular, robust REST endpoints for authorized developers to run what-if energy estimations.
        </p>
        <pre className="bg-slate-900 border border-white/10 p-4 rounded-xl text-xs font-mono text-cyan-400 overflow-x-auto">
{`POST /api/coach/whatif
Content-Type: application/json

{
  "appliance": "AC",
  "change_type": "temp_up",
  "change_value": "2"
}`}
        </pre>
      </div>
    )
  },
  contact: {
    title: 'Contact the Voltify Team',
    subtitle: 'Reach out for inquiries, feedback, or enterprise calibration partnerships',
    icon: Mail,
    content: (
      <div className="space-y-6 text-gray-300 leading-relaxed font-sans text-center py-6">
        <Mail className="size-12 text-primary mx-auto mb-4 animate-bounce" />
        <p className="text-base text-white font-semibold">Have questions or feedback?</p>
        <p className="text-xs text-gray-400 max-w-sm mx-auto">
          Our engineering team would love to hear from you. Email us directly at:
        </p>
        <a href="mailto:support@voltify-energy.com" className="text-primary font-mono text-sm font-bold block mt-2 hover:underline">
          support@voltify-energy.com
        </a>
      </div>
    )
  },
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'Read our terms of statement data handling and transparency pledges',
    icon: ShieldCheck,
    content: (
      <div className="space-y-6 text-gray-300 leading-relaxed font-sans">
        <p>
          This privacy policy describes how Voltify handles statement parsing parameters and user metadata.
        </p>
        <p>
          We do not sell, rent, or lease your energy metrics to any third parties. All computational results are used strictly inside the client panel to generate recommendations and streak awards.
        </p>
      </div>
    )
  },
  terms: {
    title: 'Terms of Use',
    subtitle: 'Agreement details and disclaimers for using the Voltify simulator',
    icon: BookOpen,
    content: (
      <div className="space-y-6 text-gray-300 leading-relaxed font-sans">
        <p>
          By accessing the Voltify panel, you acknowledge that all estimation results represent statistical models and approximations rather than physical meter calibrations.
        </p>
        <p>
          Voltify is not liable for minor billing differences against your official DISCOM statements. Please consult certified energy auditors for physical household electrical updates.
        </p>
      </div>
    )
  }
};

export default function InfoPage() {
  const { slug } = useParams<{ slug: string }>();
  const page = slug ? INFO_PAGES[slug.toLowerCase()] : null;
  const IconComponent = page?.icon || HelpCircle;

  if (!page) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-body text-white p-6 text-center">
        <HelpCircle className="size-12 text-volt-pink mb-4" />
        <h1 className="font-display font-semibold text-2xl mb-2">Page Not Found</h1>
        <p className="text-gray-400 text-xs mb-6">The guideline page you requested does not exist or has been moved.</p>
        <Link to="/" className="bg-primary text-slate-950 px-6 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider hover:opacity-90 transition-all">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 font-body text-white flex flex-col items-center justify-center p-6 sm:p-10 relative">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 size-[400px] bg-primary/5 rounded-full blur-[140px] -z-10" />

      <div className="w-full max-w-2xl space-y-6 relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-gray-450 hover:text-white transition-colors cursor-pointer group">
          <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </Link>

        <GlassCard className="p-8 space-y-6 border border-white/[0.06] bg-slate-900/60 backdrop-blur-md">
          <div className="flex items-center gap-4 border-b border-white/5 pb-5">
            <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <IconComponent className="size-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-semibold text-xl sm:text-2xl text-white">{page.title}</h1>
              <p className="text-xs text-gray-450 mt-1">{page.subtitle}</p>
            </div>
          </div>

          <div className="pt-2">
            {page.content}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
export { InfoPage };
