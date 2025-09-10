import React from 'react';
const { useEffect, useState } = React;
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, SafeAreaView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';

// Simplified types
interface Lesson {
  id: string;
  title: string;
  content: string;
  duration: string;
}

interface CourseQuizQuestion {
  id: string; question: string; options: string[]; correct: number; explanation: string;
}

interface CourseData {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  lessons: Lesson[];
  quiz: { questions: CourseQuizQuestion[]; passingScore: number };
  nftReward: { id: string; title: string; emoji: string };
}

interface NFTAward {
  id: string; courseId: string; title: string; emoji: string; awardedAt: string; uniqueCode: string;
}

const STORAGE_KEY = 'simple-learn-progress-v1';

interface StoredProgress {
  completedLessons: string[];
  completedCourses: string[];
  nfts: NFTAward[];
}

const initialProgress: StoredProgress = { completedLessons: [], completedCourses: [], nfts: [] };

// Minimal focused courses (expanded)
const STANDARD_BANK_COURSE: CourseData = {
  id: 'standard-bank-essentials',
  title: 'Standard Bank Essentials',
  description: 'Learn the core Standard Bank products: everyday accounts, savings, credit, loans and more. Read lessons, then take the 10‑question quiz to earn your collectible badge.',
  category: 'Banking',
  difficulty: 'Beginner',
  lessons: [
  { id: 'sb-accounts', title: 'Accounts Overview', duration: '6 min', content: `Objective: Understand everyday (transactional) account types, pricing models and how to minimise avoidable fees.

1. Purpose of Transactional Accounts:
Everyday accounts provide a safe hub for salary deposits, debit orders, card payments, ATM withdrawals and digital transfers. They prioritise liquidity and payment functionality over high interest.

2. Pricing Models:
• Bundled / Flat Fee: Fixed monthly fee covers a basket (e.g. X card swipes + Y digital payments). Predictable for moderate / high usage.
• Pay‑As‑You‑Transact: Low / no base fee but each swipe / EFT / withdrawal billed. Efficient only if volume is genuinely low.
• Hybrid / Tiered: Base fee plus discounted rates after threshold volumes.

3. Cost Control Checklist:
• Map last 2–3 months of actual transactions; pick model that matches pattern.
• Limit ATM cash usage—digital payments often cheaper and safer.
• Consolidate small debit orders (e.g. combine streaming services on one card) to reduce clutter and spot fraud faster.
• Enable real‑time payment notifications; act quickly on unknown debits.
• Keep a minimum balance buffer to prevent unpaid debit order fees.

4. Optimising Account Mix:
Some users maintain two accounts: primary salary + low‑fee secondary for discretionary spending (weekly top‑ups create natural budgeting).

5. Common Pitfalls:
• Ignoring dormant subscription debits.
• Paying for premium bundles while using <30% of included transactions.
• Leaving overdraft facility active unnecessarily (risk of accidental utilisation + fees).

Action Steps:
1. Export last 90 days of transactions (CSV if possible).
2. Categorise by type (swipe, EFT, cash withdrawal, debit order).
3. Simulate costs under bundled vs pay‑as‑you‑go schedule.
4. Switch or downgrade if potential annual saving > 10–15%.

Disclaimer: Fee structures, limits and names change; always verify current official tariff guides before taking action.` },
  { id: 'sb-savings', title: 'Savings Products', duration: '7 min', content: `Objective: Match savings vehicle types to financial goals across time horizons.

1. Core Categories:
• Instant Access (e.g. savings pocket): Lower rate, full liquidity. Ideal for emergency fund (3–6 months essential expenses).
• Notice Account (e.g. 32 / 45 day): Must give advance notice to withdraw; bank gains predictability, you often gain moderately higher rate.
• Fixed / Term Deposit: Funds locked for agreed term (1–24+ months). Highest certainty of rate; opportunity cost if rates rise.
• Goal‑Based / Flexible Sub‑Accounts: Segmentation tool for psychological commitment (vacation, education, tax).

2. Rate Drivers:
• Term length & commitment.
• Market benchmark rates (repo, prime, interbank).
• Balance tiers—larger balances may earn incremental uplift.

3. Building the Emergency Fund:
• Target: Start with R1,000–R5,000 seed; build towards multi‑month coverage.
• Automate: Standing order the day after payday.
• Protect: Keep in separate labelled pocket to reduce impulse spending.

4. Evaluating Real Return:
Nominal Rate – Inflation – (Tax on interest beyond exempt threshold). If negative, fund still provides liquidity insurance; don’t chase yield blindly with capital risk.

5. Avoid These Mistakes:
• Breaking fixed deposits early (penalties) for non‑emergencies.
• Chasing marginally higher rates by constantly switching (administrative friction + potential missed days).
• Neglecting to increase contribution after salary raise (“lifestyle creep”).

Action Steps:
1. Define emergency fund target (months * average essential cost).
2. Automate monthly deposit.
3. Annual review: compare effective yield vs inflation.
4. Split medium‑term goals into separate labelled pockets.

Disclaimer: Interest rates and tax thresholds change; verify current published information.` },
  { id: 'sb-credit-cards', title: 'Credit Cards Basics', duration: '7 min', content: `Objective: Use credit cards to build credit history and transactional convenience while avoiding high‑interest revolving debt.

1. Mechanics:
Statement Cycle (spend period) + Grace Period (interest‑free if full statement balance paid). Interest accrues only on unpaid statement portion.

2. Key Metrics:
• Utilisation Ratio = Balance / Limit. Target <30% (lower often better for score health).
• Effective APR: Includes interest + mandatory service fees.

3. Responsible Use Framework:
• Treat card as a debit proxy: schedule full statement debit order.
• Enable push alerts for each authorisation.
• Maintain a transaction log for large purchases (>R1,000) noting warranty / return info.

4. Fraud & Dispute Prevention:
• Never store CVV in plaintext notes.
• Use virtual card numbers where offered for online merchants.
• Report unrecognised transactions immediately (early dispute window advantage).

5. Rewards Perspective:
Points or cashback typically yield 0.5–1.5% of spend. Revolving a balance at >15% interest eliminates reward value rapidly—net negative trade‑off.

Action Steps:
1. Set automatic full‑balance payment.
2. Add calendar reminder 2 days before due date to verify funds available.
3. Quarterly review: utilisation trend + unnecessary subscriptions.
4. If carrying balance >2 cycles, create structured payoff plan (snowball / avalanche method).

Warning: Never increase limit solely to spend more; request increases only to reduce utilisation percentage safely.` },
  { id: 'sb-loans', title: 'Personal & Student Loans', duration: '8 min', content: `Objective: Evaluate instalment loans (personal, student) using total cost, necessity and resilience criteria.

1. Structure:
Principal + Interest + Initiation / Service Fees over fixed term (e.g. 12–72 months). Repayment = amortising instalment (early payments majority interest portion).

2. When Justified:
• Education / skill where expected future cash flow uplift > total loan cost.
• Consolidation: Replacing multiple high‑rate debts with single lower‑rate structured payoff.
• Essential large expense where deferral causes greater cost (e.g. critical certification deadline).

3. Evaluation Checklist:
• Net Benefit: Present value (expected income uplift) – Total repayment.
• Debt‑to‑Income (DTI) impact: New instalment keeps total DTI below prudent threshold.
• Emergency Fund Adequacy pre‑loan.
• Variable Rate Sensitivity: Stress test +200bps rate scenario.
• Early Settlement Terms: Are penalties flat, declining, or percentage based?

4. Red Flags:
• Using long‑term loan for short‑lived consumables.
• Refinancing repeatedly only to lower monthly payment (extending total interest).
• Lack of clear payoff date plan.

5. Optimisation:
• Round up instalment slightly (e.g. +R50) to reduce term.
• Apply windfalls (bonus / tax refund) as lump‑sum principal reductions.

Action Steps:
1. Get written quotes from at least 2 lenders with comparable APR.
2. Build a repayment schedule spreadsheet (principal vs interest breakdown).
3. Run sensitivity (income -10%, interest +2%).
4. Only proceed if still affordable and net positive in stressed scenario.

Risk: Longer terms lower instalment today but often materially increase total interest paid; balance convenience vs lifetime cost.` },
  { id: 'sb-vehicle', title: 'Vehicle Finance', duration: '7 min', content: `Objective: Assess true cost and risk factors of purchasing a vehicle using finance.

1. Core Components:
• Deposit: Reduces financed principal; higher deposit lowers interest cost.
• Term: 36–72 months common; longer = lower instalment but higher total interest.
• Interest Rate: Fixed (predictable) vs variable (tracks base rate movements).
• Balloon / Residual: Deferred lump sum (e.g. 20–35%) payable at term end.

2. Total Cost of Ownership (TCO):
Instalment + Comprehensive insurance + Fuel + Maintenance / service plan + Tyres + Licensing + Unexpected repairs. Often 15–30% above instalment alone.

3. Balloon Considerations:
Pros: Lower monthly cash outflow.
Cons: Equity gap risk if resale value < residual; refinancing risk (future rates higher or credit profile worsens).

4. Depreciation Dynamics:
Greatest value drop typically in first 24–36 months. Certified pre‑owned 18–30 months old can offer value / warranty balance.

5. Budget Stress Testing:
• Simulate +R1.50 per litre fuel cost.
• Simulate insurance premium +15% at renewal.
• Reserve monthly sinking fund for tyres & service outside plans.

6. Negotiation Tips:
• Discuss vehicle price first; separate from finance terms to avoid trade‑off obfuscation.
• Request full amortisation and residual schedule in writing.

Action Steps:
1. Compute TCO; ensure <15%–18% of gross income (context dependent).
2. Evaluate savings goal vs immediate purchase (delay may shift leverage).
3. Avoid max balloon if you cannot pre‑fund at least 50% of it by month 30.
4. Reassess annually; make optional principal prepayments if feasible.

Note: Always verify official finance quotations; informal calculators may exclude administration and initiation fees.` },
  ],
  quiz: {
    passingScore: 70,
    questions: [
      { id: 'q1', question: 'What type of account is MyMo Plus?', options: ['Savings only', 'Low-cost everyday account', 'Credit facility', 'Business account'], correct: 1, explanation: 'MyMo Plus is a low‑cost everyday transactional account.' },
      { id: 'q2', question: 'PureSave is best used for?', options: ['Speculative trading', 'Short-term spending', 'Separating and growing savings', 'High-risk investing'], correct: 2, explanation: 'PureSave helps you separate and steadily grow savings.' },
      { id: 'q3', question: 'Credit card interest‑free period applies when?', options: ['You pay minimum only', 'You pay full statement balance', 'You skip a payment', 'Never'], correct: 1, explanation: 'Paying the full statement balance preserves the interest‑free grace period.' },
      { id: 'q4', question: 'Total cost of credit includes?', options: ['Principal + interest + fees', 'Principal only', 'Interest only', 'Fees only'], correct: 0, explanation: 'Always assess principal, interest and all fees.' },
      { id: 'q5', question: 'Balloon payment impact?', options: ['Lowers total interest', 'Raises instalments', 'Lowers instalments but increases total interest', 'Removes need for deposit'], correct: 2, explanation: 'Balloon lowers monthly instalments but usually increases total interest over term.' },
      { id: 'q6', question: 'Emergency fund should be stored in?', options: ['Illiquid investment', 'High‑fee account', 'Accessible interest‑bearing account', 'Foreign currency only'], correct: 2, explanation: 'Liquidity + some interest = appropriate emergency storage.' },
      { id: 'q7', question: 'Responsible credit card use includes?', options: ['Maxing limit', 'Paying full balance monthly', 'Only paying late fees', 'Ignoring statements'], correct: 1, explanation: 'Full monthly repayment avoids interest and builds credit health.' },
      { id: 'q8', question: 'Before taking a personal loan you should?', options: ['Ignore interest rate', 'Check affordability & purpose', 'Borrow maximum offered', 'Skip reading terms'], correct: 1, explanation: 'Purpose + affordability evaluation prevents debt stress.' },
      { id: 'q9', question: 'Vehicle finance balloon risk?', options: ['Owing large amount at term end', 'Higher equity guaranteed', 'No impact on ownership cost', 'Removes need for insurance'], correct: 0, explanation: 'A large residual amount remains payable or needs refinancing.' },
      { id: 'q10', question: 'Savings account advantage?', options: ['Negative interest', 'Locked permanently', 'Transparent growth & separation', 'Unlimited risk'], correct: 2, explanation: 'Separating goals increases behavioural follow‑through.' },
    ]
  },
  nftReward: { id: 'nft-standard-bank', title: 'Standard Bank Scholar', emoji: '🏦' }
};

// Additional Course 1: Digital Banking & Security
const DIGITAL_SECURITY_COURSE: CourseData = {
  id: 'digital-banking-security',
  title: 'Digital Banking & Security',
  description: 'Protect your money using secure digital banking habits: authentication, phishing awareness, transaction monitoring, and device hygiene.',
  category: 'Banking',
  difficulty: 'Beginner',
  lessons: [
  { id: 'dbs-auth', title: 'Strong Authentication', duration: '5 min', content: `Objective: Implement layered authentication that resists credential theft and SIM‑swap attacks.

1. MFA Hierarchy (Strongest → Weakest):
Hardware Security Key ≥ App‑Based Time Codes ≥ Push Approval ≥ SMS OTP ≥ Email Link.

2. Best Practice:
• Unique banking password (>=12 chars; passphrase style).
• Enable biometric unlock plus secondary factor for high‑risk actions.
• Immediately revoke access on lost device from online banking profile.

3. Push Fatigue Exploit:
Attackers trigger repeated push approvals hoping for accidental acceptance. Decline unexpected prompts; change password if they recur.

Action Steps:
1. Audit active trusted devices.
2. Enable app‑based OTP; disable fallback to SMS if allowed.
3. Store recovery codes securely offline.` },
  { id: 'dbs-phishing', title: 'Phishing & Social Engineering', duration: '6 min', content: `Objective: Detect and neutralise social engineering attempts before credential or payment compromise.

1. Common Channels:
• Email (phishing), SMS (smishing), Voice (vishing), Messaging apps (impersonation), Fake ads (malvertising).

2. Psychological Levers:
Urgency (“final warning”), Scarcity (“limited refund”), Authority (“compliance officer”), Fear (“account locked”), Curiosity.

3. Technical Red Flags:
• Misspelled domains (bank-secure.example vs example.com).
• Mixed language or inconsistent branding.
• Mismatched display name and return path.

4. Response Protocol:
• Do not click embedded links—open official bookmarked app/site instead.
• Never relay OTP or approve push not initiated by you.
• Capture evidence (screenshot, headers) for reporting.

Action Steps:
1. Add official bank domain to safe bookmarks.
2. Educate family sharing devices.
3. Report suspicious attempt to bank fraud desk; then delete.` },
  { id: 'dbs-device', title: 'Device Hygiene', duration: '5 min', content: `Objective: Maintain a hardened mobile environment reducing attack surface.

1. Patch Discipline: Apply OS + banking app updates promptly (critical vulnerabilities often exploited within days of disclosure).
2. Source Integrity: Only install from official store; review publisher name + rating trend.
3. Permissions Principle: Revoke camera / microphone / storage permissions from unused apps.
4. Rooting / Jailbreak Risk: Removes sandbox protections; many banking apps downgrade trust or block on rooted devices.
5. Remote Wipe: Enable device locator + wipe to contain damage if lost.

Action Steps:
1. Monthly permission audit.
2. Enable automatic updates.
3. Uninstall dormant apps >90 days unused.` },
  { id: 'dbs-monitoring', title: 'Transaction Monitoring', duration: '5 min', content: `Objective: Detect anomalous activity at lowest possible latency.

1. Alert Configuration: Enable notifications for ALL card present + online + EFT + debit order events (including low values—fraud probes with micro‑charges).
2. Limits: Set daily + per‑transaction caps aligned with legitimate usage.
3. Reconciliation: Weekly review vs personal ledger; monthly statement deep scan.
4. Rapid Response: Use in‑app freeze / temporary block at first suspicion; escalate to fraud desk with timestamps.

Action Steps:
1. Activate push + email alerts.
2. Set conservative initial limits, raise only when friction measurable.
3. Create weekly 5‑minute review ritual.` },
  { id: 'dbs-updates', title: 'Software & Scam Trends', duration: '5 min', content: `Objective: Maintain situational awareness of evolving fraud patterns.

Emerging Vectors:
• Screen‑sharing / remote desktop takeover.
• QR‑code redirect phishing.
• Fake investment platforms promising outsized daily returns.
• SIM swap + OTP interception hybrids.

Defensive Posture:
• Subscribe to official bank security bulletins.
• Quarterly audit of connected fintech / budgeting apps; revoke unused tokens.
• Treat unsolicited “support” calls wanting screen share as fraudulent by default.

Action Steps:
1. Calendar reminder every quarter: review permissions / connected apps.
2. Maintain list of official bank contact numbers; reject others.
3. Report novel scam attempts—collective intelligence improves filtering.` },
  ],
  quiz: {
    passingScore: 70,
    questions: [
      { id: 'd1', question: 'Most resilient 2FA method listed?', options: ['SMS OTP', 'Email code', 'App / hardware token', 'Security question'], correct: 2, explanation: 'App or hardware tokens resist SIM swaps and interception better than SMS/email.' },
      { id: 'd2', question: 'Phishing red flag?', options: ['Generic greeting + urgent threat', 'Proper domain & context', 'Secure app login link you typed', 'Spelling perfect & logo high-res'], correct: 0, explanation: 'Urgency + generic greeting is classic phishing lure.' },
      { id: 'd3', question: 'Safe response to suspicious bank call?', options: ['Provide OTP immediately', 'Stay on the line no matter what', 'Hang up & call official number', 'Share card CVV to verify'], correct: 2, explanation: 'Terminate and re‑dial an independently sourced official number.' },
      { id: 'd4', question: 'Reason to set low transfer limits?', options: ['Increase fraud impact', 'Reduce alert frequency', 'Contain potential unauthorised losses', 'Improve interest'], correct: 2, explanation: 'Limits cap exposure if credentials are compromised.' },
      { id: 'd5', question: 'Unpatched OS risk?', options: ['Higher exploit surface', 'Lower battery use', 'Improved performance automatically', 'Disables biometrics'], correct: 0, explanation: 'Missing patches leave known vulnerabilities exploitable.' },
      { id: 'd6', question: 'First action on spotting unknown card charge?', options: ['Ignore until month end', 'Post on social media', 'Freeze/block card & report', 'Lend card to friend'], correct: 2, explanation: 'Immediate freeze blocks further misuse; then report to bank.' },
      { id: 'd7', question: 'Why avoid remote access tools on request?', options: ['They slow Wi‑Fi only', 'They guarantee refunds', 'They can grant attacker control', 'They update antivirus'], correct: 2, explanation: 'Remote tools can fully expose session and banking app.' },
      { id: 'd8', question: 'Good password practice?', options: ['Reuse across sites', 'Unique & long', 'Share with family', 'Change weekly randomly'], correct: 1, explanation: 'Unique, sufficiently long passwords reduce credential stuffing risk.' },
      { id: 'd9', question: 'Transaction alert benefit?', options: ['Hides spending', 'Delays detection', 'Immediate fraud visibility', 'Increases fees'], correct: 2, explanation: 'Real‑time alerts allow earliest possible fraud response.' },
      { id: 'd10', question: 'App update importance?', options: ['Removes features', 'Adds vulnerabilities only', 'Often patches security flaws', 'Only changes theme'], correct: 2, explanation: 'Updates frequently fix known security vulnerabilities.' },
    ]
  },
  nftReward: { id: 'nft-digital-security', title: 'Secure Banker', emoji: '🛡️' }
};

// Additional Course 2: Investing & Wealth Basics
const INVESTING_BASICS_COURSE: CourseData = {
  id: 'investing-basics',
  title: 'Investing & Wealth Basics',
  description: 'Foundational concepts: compounding, diversification, risk tolerance, costs, and behavioural discipline.',
  category: 'Wealth',
  difficulty: 'Beginner',
  lessons: [
  { id: 'inv-compound', title: 'Power of Compounding', duration: '6 min', content: `Objective: Illustrate exponential effect of reinvesting returns over long horizons.

1. Concept: Each period’s return is earned on original principal plus accumulated prior returns.
2. Simple Illustration: R10,000 at 8% compounded annually ≈ R21,589 after 10 years vs R18,000 with simple (non‑reinvested) interest.
3. Sensitivity: Small rate differences (8% vs 9%) widen significantly over multi‑decade horizons.
4. Edge Over Timing: Missing a handful of top market days historically erodes long‑term CAGR dramatically.

Action Steps:
• Prioritise early consistent contributions.
• Reinvest distributions (dividends / interest) automatically.
• Avoid unnecessary cash drag in settlement accounts.` },
  { id: 'inv-risk', title: 'Risk & Volatility', duration: '6 min', content: `Objective: Distinguish volatility from true investment risk and align allocation to tolerance + horizon.

1. Volatility: Statistical dispersion of returns (standard deviation). Feels like emotional discomfort but not automatically loss.
2. Risk (Practical): Permanent capital impairment or failing to meet required future liability.
3. Horizon Buffer: Longer horizons allow recovery cycles; equity allocation proportion typically increases with extended timeframe.
4. Liquidity Layer: Maintain near‑term cash needs in low‑volatility instruments to prevent forced selling.

Action Steps:
• Define liabilities timeline (tuition, deposit, retirement).
• Map each liability to matching asset bucket.
• Stress test portfolio with historical drawdowns.` },
  { id: 'inv-diversify', title: 'Diversification', duration: '5 min', content: `Objective: Reduce idiosyncratic risk through imperfectly correlated return streams.

1. Dimensions:
• Asset Class: Equities, Bonds, Cash, Real Assets.
• Geography: Domestic vs global exposure mitigates local shocks.
• Sector / Industry: Avoid concentration (e.g. all tech growth).
• Factor / Style: Growth vs Value, Large vs Small Cap, Quality, Momentum.

2. Correlation Effect: Combining assets with <1 correlation lowers volatility for a given expected return (efficient frontier concept).

Action Steps:
• Identify current concentration >20% in any single stock or >35% in sector.
• Introduce broad‑based index instruments to fill gaps.
• Periodically recalc weight drift vs target allocation.` },
  { id: 'inv-costs', title: 'Fees & Costs', duration: '5 min', content: `Objective: Quantify cumulative drag of layered investment costs.

1. Fee Layers:
• Platform / account admin.
• Fund expense ratio (TER).
• Advisory % of assets.
• Transaction / brokerage and bid–offer spreads.

2. Compounding Drag: 1% annual differential over 30 years can reduce terminal value by >20% versus lower‑fee alternative (holding return assumptions constant).
3. Cost vs Value: Paying modest advisory fee may be net positive if it prevents behavioural mistakes larger than fee.

Action Steps:
• List all annual percentages + fixed fees.
• Compute blended all‑in fee = (Sum of % fees) + (fixed fees / portfolio value).
• Seek cheaper share class / ETF when overlap exists.` },
  { id: 'inv-behaviour', title: 'Behavioural Discipline', duration: '6 min', content: `Objective: Implement systems reducing emotional decision impact on returns.

1. Cognitive Biases:
• Loss Aversion: Loss pain > gain pleasure leads to premature selling.
• Recency Bias: Overweighting latest performance streak.
• Herding: Copying crowd without thesis.

2. Guardrails:
• Written Investment Policy Statement (IPS) outlining target allocation, rebalancing cadence, max position sizes.
• Pre‑defined rebalancing bands (e.g. ±5%).
• Automatic contribution schedule.

3. Journal & Review: Log rationale for major allocation changes; review after 6–12 months to calibrate decision quality.

Action Steps:
• Draft a one‑page IPS.
• Set automated monthly investment.
• Schedule semi‑annual behavioural review session.` },
  ],
  quiz: {
    passingScore: 70,
    questions: [
      { id: 'i1', question: 'Compounding accelerates growth by?', options: ['Reducing principal', 'Earning returns on reinvested returns', 'Eliminating volatility', 'Doubling risk'], correct: 1, explanation: 'Reinvestment increases the base on which future returns accrue.' },
      { id: 'i2', question: 'Volatility is?', options: ['Guaranteed loss', 'Price fluctuation magnitude', 'Permanent capital destruction always', 'Fee structure'], correct: 1, explanation: 'Volatility refers to dispersion of returns / price movement magnitude.' },
      { id: 'i3', question: 'Diversification goal?', options: ['Maximize single-stock exposure', 'Eliminate all risk', 'Smooth drawdowns & reduce unsystematic risk', 'Increase fees'], correct: 2, explanation: 'Diversification reduces idiosyncratic risk and smooths performance.' },
      { id: 'i4', question: 'Fee impact over decades?', options: ['Negligible', 'Can significantly reduce final wealth', 'Increases returns automatically', 'Only affects bonds'], correct: 1, explanation: 'Even 1% annual drag compounds to large value differences over time.' },
      { id: 'i5', question: 'Behavioural mistake example?', options: ['Regular contributions', 'Rebalancing policy', 'Panic selling during dip', 'Long-term allocation'], correct: 2, explanation: 'Emotion-driven liquidation locks in losses.' },
      { id: 'i6', question: 'Asset allocation should match?', options: ['Favourite color', 'Short-term news', 'Time horizon & objectives', 'Random selection'], correct: 2, explanation: 'Horizon and goals drive suitable risk exposure.' },
      { id: 'i7', question: 'Correlation helps because?', options: ['Perfectly correlated assets diversify better', 'Low/negative correlation reduces portfolio swings', 'High correlation increases return guarantee', 'Correlation sets fees'], correct: 1, explanation: 'Lower correlation reduces variance at given expected return.' },
      { id: 'i8', question: 'Rebalancing does what?', options: ['Ignores drift', 'Sells winners & adds to laggards to maintain target weights', 'Maximizes taxes intentionally', 'Eliminates risk fully'], correct: 1, explanation: 'Systematic rebalancing controls risk drift.' },
      { id: 'i9', question: 'High expense ratio concern?', options: ['Increases net return', 'No compounding impact', 'Compounds fee drag over time', 'Eliminates volatility'], correct: 2, explanation: 'Compounded fees reduce net terminal value.' },
      { id: 'i10', question: 'Best long-term habit?', options: ['Timing every top & bottom', 'Chasing momentum only', 'Consistent diversified investing & staying the course', 'Concentrating all funds in one stock'], correct: 2, explanation: 'Consistency + diversification harness compounding reliably.' },
    ]
  },
  nftReward: { id: 'nft-investing-basics', title: 'Wealth Apprentice', emoji: '📈' }
};

const COURSES: CourseData[] = [STANDARD_BANK_COURSE, DIGITAL_SECURITY_COURSE, INVESTING_BASICS_COURSE];

// Master NFT for completing all courses
const MASTER_NFT_ID = 'nft-master-banking';
const MASTER_NFT_TITLE = 'Financial Fundamentals Master';
const MASTER_NFT_EMOJI = '🎓';

export default function SimpleLearning() {
  const [progress, setProgress] = useState<StoredProgress>(initialProgress);
  const [activeCourse, setActiveCourse] = useState<CourseData | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [quizVisible, setQuizVisible] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [showExplanations, setShowExplanations] = useState(true); // auto show explanations after submission

  // Load stored progress
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setProgress(JSON.parse(raw));
      } catch (e) { /* ignore */ }
    })();
  }, []);

  const persist = async (next: StoredProgress) => {
    setProgress(next);
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const markLessonComplete = (lessonId: string) => {
    if (progress.completedLessons.includes(lessonId)) return;
    const next = { ...progress, completedLessons: [...progress.completedLessons, lessonId] };
    persist(next);
  };

  const allLessonsRead = (course: CourseData) => course.lessons.every(l => progress.completedLessons.includes(l.id));

  const openLesson = (lesson: Lesson) => {
    setActiveLesson(lesson);
    setShowLessonModal(true);
    // Auto mark as read when opened (simple approach)
    markLessonComplete(lesson.id);
  };

  const startQuiz = () => {
    if (!activeCourse) return;
    if (!allLessonsRead(activeCourse)) {
      Alert.alert('Finish Lessons', 'Please read all lessons before starting the quiz.');
      return;
    }
    setAnswers(new Array(activeCourse.quiz.questions.length).fill(-1));
    setShowResult(false);
    setScore(0);
    setQuizVisible(true);
  };

  const submitQuiz = () => {
    if (!activeCourse) return;
    const correct = activeCourse.quiz.questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);
    const pct = Math.round((correct / activeCourse.quiz.questions.length) * 100);
    setScore(pct);
    setShowResult(true);
    if (pct >= activeCourse.quiz.passingScore && !progress.completedCourses.includes(activeCourse.id)) {
      // Award course completion + NFT
      const nft: NFTAward = {
        id: activeCourse.nftReward.id + '-' + Date.now(),
        courseId: activeCourse.id,
        title: activeCourse.nftReward.title,
        emoji: activeCourse.nftReward.emoji,
        awardedAt: new Date().toISOString(),
        uniqueCode: Math.random().toString(36).slice(2, 10).toUpperCase(),
      };
      let next: StoredProgress = {
        ...progress,
        completedCourses: [...progress.completedCourses, activeCourse.id],
        nfts: [...progress.nfts, nft]
      };
      // Check for master NFT condition
      const allDone = COURSES.every(c => next.completedCourses.includes(c.id));
      const hasMaster = next.nfts.some(n => n.id.startsWith(MASTER_NFT_ID));
      if (allDone && !hasMaster) {
        const masterNFT: NFTAward = {
          id: MASTER_NFT_ID + '-' + Date.now(),
          courseId: 'all-courses',
          title: MASTER_NFT_TITLE,
          emoji: MASTER_NFT_EMOJI,
          awardedAt: new Date().toISOString(),
          uniqueCode: Math.random().toString(36).slice(2, 10).toUpperCase(),
        };
        next = { ...next, nfts: [...next.nfts, masterNFT] };
        Alert.alert('Mastery Achieved!', `All courses complete. You earned the ${masterNFT.title} NFT (${masterNFT.uniqueCode}) 🎓`);
      } else {
        Alert.alert('Course Completed!', `You earned the ${nft.title} NFT (${nft.uniqueCode}) 🎉`);
      }
      persist(next);
    }
  };

  const renderCourseCard = (course: CourseData) => {
    const lessonsCompleted = course.lessons.filter(l => progress.completedLessons.includes(l.id)).length;
    const pct = Math.round((lessonsCompleted / course.lessons.length) * 100);
    const completed = progress.completedCourses.includes(course.id);
    return (
      <TouchableOpacity key={course.id} style={styles.courseCard} activeOpacity={0.85} onPress={() => setActiveCourse(course)}>
        <View style={styles.courseHeaderRow}>
          <Text style={styles.courseTitle}>{course.title}</Text>
          <View style={[styles.badge, completed && styles.badgeCompleted]}>
            <Text style={styles.badgeText}>{completed ? 'Done' : course.difficulty}</Text>
          </View>
        </View>
        <Text style={styles.courseDesc}>{course.description}</Text>
        <View style={styles.progressBarOuter}>
          <View style={[styles.progressBarInner, { width: pct + '%' }]} />
        </View>
        <Text style={styles.progressLabel}>{lessonsCompleted}/{course.lessons.length} lessons • {pct}%</Text>
        {completed && <Text style={styles.completedNFT}>{course.nftReward.emoji} {course.nftReward.title} NFT earned</Text>}
      </TouchableOpacity>
    );
  };

  const activeNFTs = progress.nfts.filter(n => activeCourse && n.courseId === activeCourse.id);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.screenTitle}>Learn</Text>
        <Text style={styles.screenSubtitle}>Read the lessons then take the 10‑question quiz to earn a collectible NFT.</Text>

        {/* NFTs owned summary */}
        {progress.nfts.length > 0 && (
          <View style={styles.nftBar}>
            {progress.nfts.map(n => (
              <View key={n.id} style={styles.nftChip}>
                <Text style={styles.nftEmoji}>{n.emoji}</Text>
                <Text style={styles.nftChipText}>{n.title}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Courses</Text>
          {COURSES.map(renderCourseCard)}
        </View>

        {activeCourse && (
          <View style={styles.activeCourse}>
            <View style={styles.activeHeaderRow}>
              <Text style={styles.activeCourseTitle}>{activeCourse.title}</Text>
              <TouchableOpacity onPress={() => setActiveCourse(null)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                <Ionicons name="close" size={20} color={theme.colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.activeDesc}>{activeCourse.description}</Text>
            <Text style={styles.lessonsHeader}>Lessons</Text>
            {activeCourse.lessons.map(lesson => {
              const done = progress.completedLessons.includes(lesson.id);
              return (
                <TouchableOpacity key={lesson.id} style={[styles.lessonRow, done && styles.lessonRowDone]} onPress={() => openLesson(lesson)}>
                  <Ionicons name={done ? 'checkmark-circle' : 'book'} size={20} color={done ? theme.colors.success : theme.colors.primary} />
                  <View style={styles.lessonInfo}>
                    <Text style={styles.lessonTitle}>{lesson.title}</Text>
                    <Text style={styles.lessonMeta}>{lesson.duration}{done ? ' • Read' : ''}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={[styles.quizButton, (!allLessonsRead(activeCourse) && styles.quizButtonDisabled)]} disabled={!allLessonsRead(activeCourse)} onPress={startQuiz}>
              <Ionicons name="help-circle" size={18} color="#FFFFFF" />
              <Text style={styles.quizButtonText}>Start Quiz (10 Questions)</Text>
            </TouchableOpacity>
            {activeNFTs.length > 0 && (
              <View style={styles.nftEarnedBox}>
                <Text style={styles.nftEarnedTitle}>Earned NFT</Text>
                {activeNFTs.map(n => (
                  <Text key={n.id} style={styles.nftEarnedLine}>{n.emoji} {n.title} • Code: {n.uniqueCode}</Text>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Lesson Modal */}
      <Modal visible={showLessonModal} animationType="slide" onRequestClose={() => setShowLessonModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{activeLesson?.title}</Text>
            <TouchableOpacity onPress={() => setShowLessonModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.lessonContent}>{activeLesson?.content}</Text>
            <TouchableOpacity style={styles.completeLessonButton} onPress={() => setShowLessonModal(false)}>
              <Text style={styles.completeLessonText}>Done Reading</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Quiz Modal */}
      <Modal visible={quizVisible} animationType="slide" onRequestClose={() => setQuizVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Course Quiz</Text>
            <TouchableOpacity onPress={() => setQuizVisible(false)}>
              <Ionicons name="close" size={24} color={theme.colors.muted} />
            </TouchableOpacity>
          </View>
          {!showResult && activeCourse && (
            <ScrollView style={styles.modalBody}>
              {activeCourse.quiz.questions.map((q, qi) => (
                <View key={q.id} style={styles.questionBlock}>
                  <Text style={styles.questionText}>{qi + 1}. {q.question}</Text>
                  {q.options.map((opt, oi) => {
                    const selected = answers[qi] === oi;
                    return (
                      <TouchableOpacity key={oi} style={[styles.optionBtn, selected && styles.optionBtnSelected]} onPress={() => {
                        const next = [...answers]; next[qi] = oi; setAnswers(next);
                      }}>
                        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{String.fromCharCode(65 + oi)}. {opt}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
              <TouchableOpacity style={[styles.submitQuizButton, answers.some(a => a === -1) && styles.submitQuizDisabled]} disabled={answers.some(a => a === -1)} onPress={submitQuiz}>
                <Text style={styles.submitQuizText}>Submit Quiz</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
          {showResult && activeCourse && (
            <ScrollView style={styles.modalBody} contentContainerStyle={styles.resultScrollContent}>
              <View style={styles.resultHeader}>
                <Ionicons name={score >= activeCourse.quiz.passingScore ? 'checkmark-circle' : 'close-circle'} size={72} color={score >= activeCourse.quiz.passingScore ? theme.colors.success : theme.colors.danger} />
                <Text style={styles.resultScore}>{score}%</Text>
                <Text style={styles.resultMsg}>{score >= activeCourse.quiz.passingScore ? 'Passed - Course Completed!' : 'Try again after reviewing lessons.'}</Text>
              </View>
              {showExplanations && (
                <View style={styles.explanationsBox}>
                  <Text style={styles.explanationsTitle}>Answer Review</Text>
                  {activeCourse.quiz.questions.map((q, i) => {
                    const user = answers[i];
                    const correct = q.correct;
                    const isCorrect = user === correct;
                    return (
                      <View key={q.id} style={[styles.explanationItem, !isCorrect && styles.explanationItemWrong]}>
                        <Text style={styles.explanationQuestion}>{i + 1}. {q.question}</Text>
                        <Text style={styles.explanationAnswer}>Your answer: {user > -1 ? q.options[user] : '—'}</Text>
                        {!isCorrect && <Text style={styles.explanationCorrect}>Correct: {q.options[correct]}</Text>}
                        <Text style={styles.explanationText}>{q.explanation}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
              <TouchableOpacity style={styles.closeResultButton} onPress={() => setQuizVisible(false)}>
                <Text style={styles.closeResultText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  screenTitle: { fontSize: 24, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  screenSubtitle: { fontSize: 14, color: theme.colors.muted, marginBottom: 16 },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginBottom: 8 },
  courseCard: { backgroundColor: theme.colors.card, padding: 16, borderRadius: 14, marginBottom: 14 },
  courseHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  courseTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, flex: 1, marginRight: 8 },
  badge: { backgroundColor: theme.colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeCompleted: { backgroundColor: theme.colors.success },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  courseDesc: { fontSize: 13, color: theme.colors.muted, lineHeight: 18, marginBottom: 10 },
  progressBarOuter: { height: 6, backgroundColor: theme.colors.cardAlt, borderRadius: 4, overflow: 'hidden' },
  progressBarInner: { height: '100%', backgroundColor: theme.colors.primary },
  progressLabel: { fontSize: 12, color: theme.colors.muted, marginTop: 4 },
  completedNFT: { marginTop: 6, fontSize: 12, color: theme.colors.success, fontWeight: '600' },
  activeCourse: { backgroundColor: theme.colors.cardAlt, padding: 16, borderRadius: 14, marginTop: 4 },
  activeHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  activeCourseTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  activeDesc: { fontSize: 13, color: theme.colors.muted, lineHeight: 18, marginBottom: 12 },
  lessonsHeader: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 8, marginTop: 4 },
  lessonRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.card, padding: 12, borderRadius: 12, marginBottom: 8 },
  lessonRowDone: { borderWidth: 1, borderColor: theme.colors.success },
  lessonInfo: { flex: 1, marginLeft: 12 },
  lessonTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  lessonMeta: { fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  quizButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryDark, padding: 14, borderRadius: 12, marginTop: 12 },
  quizButtonDisabled: { opacity: 0.4 },
  quizButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  nftEarnedBox: { marginTop: 14, backgroundColor: theme.colors.card, padding: 12, borderRadius: 12 },
  nftEarnedTitle: { fontSize: 12, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  nftEarnedLine: { fontSize: 12, color: theme.colors.muted },
  modalContainer: { flex: 1, backgroundColor: theme.colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: theme.colors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, flex: 1, marginRight: 12 },
  modalBody: { flex: 1, padding: 16 },
  lessonContent: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  completeLessonButton: { marginTop: 24, backgroundColor: theme.colors.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
  completeLessonText: { color: '#FFF', fontWeight: '600' },
  questionBlock: { marginBottom: 20, backgroundColor: theme.colors.card, padding: 14, borderRadius: 12 },
  questionText: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 10 },
  optionBtn: { padding: 10, borderRadius: 10, backgroundColor: theme.colors.cardAlt, marginBottom: 8 },
  optionBtnSelected: { backgroundColor: theme.colors.primary },
  optionText: { fontSize: 13, color: theme.colors.text },
  optionTextSelected: { color: '#FFF', fontWeight: '600' },
  submitQuizButton: { backgroundColor: theme.colors.success, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8, marginBottom: 40 },
  submitQuizDisabled: { opacity: 0.5 },
  submitQuizText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  resultContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  resultScore: { fontSize: 48, fontWeight: '800', color: theme.colors.text, marginTop: 12 },
  resultMsg: { fontSize: 16, color: theme.colors.muted, marginTop: 8, textAlign: 'center' },
  closeResultButton: { marginTop: 28, backgroundColor: theme.colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 30 },
  closeResultText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  resultScrollContent: { paddingBottom: 40 },
  resultHeader: { alignItems: 'center', marginBottom: 16 },
  explanationsBox: { marginTop: 8 },
  explanationsTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  explanationItem: { backgroundColor: theme.colors.card, padding: 12, borderRadius: 12, marginBottom: 12 },
  explanationItemWrong: { borderWidth: 1, borderColor: theme.colors.danger },
  explanationQuestion: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 4 },
  explanationAnswer: { fontSize: 12, color: theme.colors.muted, marginBottom: 2 },
  explanationCorrect: { fontSize: 12, color: theme.colors.success, marginBottom: 4 },
  explanationText: { fontSize: 12, color: theme.colors.text, lineHeight: 16 },
  nftBar: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  nftChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.cardAlt, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  nftEmoji: { fontSize: 16, marginRight: 4 },
  nftChipText: { fontSize: 12, color: theme.colors.text, fontWeight: '600' },
});
