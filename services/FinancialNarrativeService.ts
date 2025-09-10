import { WellbeingScoreResult } from './WellbeingScoreService';
import { BudgetPlanResult } from './BudgetRecommendationService';

export interface FinancialNarrativeResult {
  narrative: string;
  highlights: string[];
  generatedAt: string;
  scoreSummary?: string;
  budgetSummary?: string;
}

interface NarrativeInputs {
  wellbeing?: WellbeingScoreResult | null;
  budget?: BudgetPlanResult | null;
  currentBalance?: number;
  recentSpend?: number;
  monthSavingsAlloc?: number;
}

function pct(n: number, d: number) { return d > 0 ? (n / d) * 100 : 0; }

export const financialNarrativeService = {
  generate(inputs: NarrativeInputs): FinancialNarrativeResult {
    const { wellbeing, budget, currentBalance = 0, recentSpend = 0, monthSavingsAlloc = 0 } = inputs;
    const parts: string[] = [];
    const highlights: string[] = [];

    if (wellbeing) {
      const grade = wellbeing.grade;
      const score = wellbeing.score.toFixed(0);
  const topFactor = [...wellbeing.breakdown].sort((a,b)=>b.normalized-a.normalized)[0];
  const weakest = [...wellbeing.breakdown].sort((a,b)=>a.normalized-b.normalized)[0];
  const scoreLine = `Your Financial Wellbeing Score is ${score} (${grade}). Strongest area: ${topFactor.label}. Improvement opportunity: ${weakest.label}.`;
      parts.push(scoreLine);
      highlights.push(scoreLine);
    } else {
      parts.push('No wellbeing score available yet. Engage with more transactions to generate one.');
    }

    if (budget) {
      const totalSuggested = budget.recommendations.reduce((s,r)=>s + (r.suggested||0),0);
      const savingsRec = budget.recommendations.find(r=>/saving/i.test(r.category));
      const savingsSuggest = savingsRec ? savingsRec.suggested : 0;
      const savingsShare = pct(savingsSuggest, totalSuggested);
      const diversity = budget.recommendations.length;
      const budgetLine = `AI suggested allocating R${totalSuggested} across ${diversity} categories with ${savingsShare.toFixed(1)}% toward savings.`;
      parts.push(budgetLine);
      highlights.push(budgetLine);
      if (savingsShare < 10) {
        const tip = 'Consider increasing your savings allocation toward 15%+ if cash-flow allows.';
        parts.push(tip); highlights.push('Increase savings allocation.');
      }
      if (budget.note) parts.push(budget.note);
    } else {
      parts.push('Budget recommendations not generated yet. Tap Recommend to create a plan.');
    }

    if (monthSavingsAlloc > 0) {
      parts.push(`You have already allocated roughly R${monthSavingsAlloc.toFixed(2)} to savings this month.`);
    }

    const balanceLine = `Current tracked balance: R${currentBalance.toFixed(2)} with recent spend of R${recentSpend.toFixed(2)}.`;
    parts.push(balanceLine);

    const narrative = parts.join(' ');

    return {
      narrative,
      highlights: [...new Set(highlights)].slice(0,6),
      generatedAt: new Date().toISOString(),
      scoreSummary: wellbeing ? `${wellbeing.score.toFixed(0)} (${wellbeing.grade})` : undefined,
      budgetSummary: budget ? `${budget.recommendations.length} categories / R${budget.recommendations.reduce((s,r)=>s+r.suggested,0)}` : undefined,
    };
  }
};

export default financialNarrativeService;
