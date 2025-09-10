/**
 * Budget Recommendation Service (MVP)
 * Generates baseline recommended category allocations based on last 30 days spending
 * and simple heuristics (cap concentration, boost savings if surplus).
 */
export interface ExpenseInput { amount: number; category?: string; date?: string; }
export interface BudgetRecommendation { category: string; suggested: number; basis: string; confidence: number; }
export interface BudgetPlanResult { totalSuggested: number; recommendations: BudgetRecommendation[]; generatedAt: string; note?: string; }

function clamp(n:number,min=0,max=Infinity){return Math.min(max,Math.max(min,n));}

export class BudgetRecommendationService {
  static generate(expenses: ExpenseInput[] = [], targetTotal?: number): BudgetPlanResult {
    const now = new Date();
    const last30 = expenses.filter(e => {
      if(!e.date) return true; const d=new Date(e.date); return now.getTime()-d.getTime() <= 1000*60*60*24*30; });
    const catTotals: Record<string, number> = {};
    let sum = 0;
    last30.forEach(e => { const amt = e.amount||0; sum += amt; const k = e.category || 'Other'; catTotals[k]=(catTotals[k]||0)+amt; });

    // If no spending data, provide a generic scaffold
    if (sum === 0) {
      const scaffold = ['Housing','Food','Transport','Savings','Entertainment','Other'];
      const base = targetTotal || 10000; // fallback
      const weights = { Housing:0.3, Food:0.18, Transport:0.1, Savings:0.2, Entertainment:0.07, Other:0.15 } as Record<string,number>;
      const recs = scaffold.map(c => ({ category:c, suggested: Math.round(base*weights[c]), basis:'default mix', confidence:0.4 }));
      return { totalSuggested: base, recommendations: recs, generatedAt: new Date().toISOString(), note: 'No recent data; using default allocation mix.' };
    }

    // Baseline proportional allocation from spend pattern
    const categories = Object.keys(catTotals);
    const allocations: BudgetRecommendation[] = [];
    const effectiveTotal = targetTotal || sum; // if no target, propose similar total to observed

    categories.forEach(cat => {
      const share = catTotals[cat]/sum; // observed share
      const cappedShare = clamp(share, 0, 0.35); // cap any single category at 35%
      allocations.push({ category: cat, suggested: Math.round(effectiveTotal * cappedShare), basis: share>0.35? 'capped from high concentration':'proportional', confidence: 0.6 });
    });

    // Ensure at least one Savings category
    if (!allocations.some(a => a.category.toLowerCase().includes('saving'))) {
      const savingsSuggestion = Math.round(effectiveTotal * 0.15);
      allocations.push({ category: 'Savings', suggested: savingsSuggestion, basis: 'added baseline savings', confidence: 0.7 });
    }

    // Normalize to target total
    const currentSum = allocations.reduce((s,a)=>s+a.suggested,0);
    if (currentSum !== effectiveTotal) {
      const scale = effectiveTotal / currentSum;
      allocations.forEach(a => a.suggested = Math.round(a.suggested * scale));
    }

    // Confidence heuristic: more categories + more data points => higher
    const dataPoints = last30.length;
    const confidenceBoost = Math.min(0.3, dataPoints / 200); // up to +0.3
    allocations.forEach(a => a.confidence = clamp(a.confidence + confidenceBoost, 0, 0.95));

    return { totalSuggested: effectiveTotal, recommendations: allocations.sort((a,b)=>b.suggested-a.suggested), generatedAt: new Date().toISOString() };
  }
}

export const budgetRecommendationService = BudgetRecommendationService;
