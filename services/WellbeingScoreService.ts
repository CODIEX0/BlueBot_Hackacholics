import { standardBankService } from '@/services/StandardBankService';

/**
 * Financial Wellbeing Score Service (MVP)
 * Computes a 0-100 score representing holistic user financial health.
 * Dimensions (initial):
 *  - Spending Efficiency (30%)
 *  - Savings Momentum (20%)
 *  - Category Diversification (15%)
 *  - Goal Progress (20%)
 *  - Recurring vs One-off Balance (15%)
 */
export interface ExpenseLike { amount: number; category?: string; date?: string; isRecurring?: boolean; }
export interface GoalLike { targetAmount: number; currentAmount: number; priority?: 'high'|'medium'|'low'; }

export interface WellbeingBreakdownItem { key: string; label: string; weight: number; raw: number; normalized: number; contribution: number; note?: string; }
export interface WellbeingScoreResult { score: number; grade: string; breakdown: WellbeingBreakdownItem[]; generatedAt: string; }

function clamp(n: number, min=0, max=100){ return Math.min(max, Math.max(min, n)); }
function pct(part: number, total: number){ if(!total||total<=0) return 0; return (part/total)*100; }

export class WellbeingScoreService {
  static compute(expenses: ExpenseLike[] = [], goals: GoalLike[] = [], currentBalance: number): WellbeingScoreResult {
    const now = new Date();
    // Last 30 days expenses
    const last30 = expenses.filter(e => {
      if(!e.date) return true; // treat as recent
      const d = new Date(e.date);
      return now.getTime() - d.getTime() <= 1000*60*60*24*30;
    });
    const total30 = last30.reduce((s,e)=>s+(e.amount||0),0);

    // Spending Efficiency: heuristic vs soft baseline (assume baseline 60% of balance utilisable in 30d)
    const usable = currentBalance * 0.6; // soft baseline
    const efficiencyRaw = usable <=0 ? 0 : 1 - Math.abs(total30 - usable)/usable; // 1 when perfect usage
    const efficiencyNorm = clamp(efficiencyRaw * 100);

    // Savings Momentum: approximate savings = max(0, balance - total30) relative to balance
    const savingsApprox = Math.max(0, currentBalance - total30);
    const savingsMomentumNorm = clamp(pct(savingsApprox, currentBalance));

    // Category Diversification: penalize concentration. Compute Herfindahl index H = sum(p_i^2)
    const catTotals: Record<string, number> = {};
    last30.forEach(e => { const k = e.category || 'Other'; catTotals[k] = (catTotals[k]||0)+(e.amount||0); });
    const cats = Object.entries(catTotals);
    const catSum = cats.reduce((s,[,v])=>s+v,0);
    let H = 0; if(catSum>0){ cats.forEach(([,v])=>{ const p = v/catSum; H += p*p; }); }
    // Perfect diversification ~ low H. Normalize: DiversificationScore = (1 - (H - 1/N)/(1 - 1/N)) where N = cats.length
    let diversificationNorm = 50; // default median
    const N = cats.length;
    if(N>1){ const minH = 1/N; const maxH = 1; const adjusted = (H - minH)/(maxH - minH); diversificationNorm = clamp((1 - adjusted)*100); }
    else if(N<=1 && catSum>0) diversificationNorm = 40; else if(catSum===0) diversificationNorm = 0; // no data

    // Goal Progress: weighted average of goal completion (high priority x1.0, medium x0.7, low x0.4)
    let totalWeight = 0; let weighted = 0;
    goals.forEach(g => { const w = g.priority==='high'?1: g.priority==='medium'?0.7:0.4; const progress = g.targetAmount>0? clamp((g.currentAmount/g.targetAmount)*100):0; totalWeight += w; weighted += progress * w; });
    const goalProgressNorm = totalWeight>0? weighted/totalWeight : 0;

    // Recurring vs One-off: aim for balanced baseline where recurring <= 55% of spend (too high => inflexible budget)
    const recurringSpend = last30.filter(e=>e.isRecurring).reduce((s,e)=>s+(e.amount||0),0);
    const recurringPct = pct(recurringSpend, total30);
    let recurringNorm = 50; // baseline
    if (total30===0) recurringNorm = 0; else if(recurringPct<=55){ // ideal zone 35-55 yields high score
      if(recurringPct<35) recurringNorm = clamp(70 - (35 - recurringPct)); else recurringNorm = clamp(90 - Math.abs(45 - recurringPct));
    } else { recurringNorm = clamp(80 - (recurringPct-55)); }

    const breakdown: WellbeingBreakdownItem[] = [
      { key:'efficiency', label:'Spending Efficiency', weight:0.30, raw:efficiencyRaw, normalized:efficiencyNorm, contribution:efficiencyNorm*0.30 },
      { key:'savings', label:'Savings Momentum', weight:0.20, raw:savingsApprox, normalized:savingsMomentumNorm, contribution:savingsMomentumNorm*0.20 },
      { key:'diversification', label:'Category Diversification', weight:0.15, raw:H, normalized:diversificationNorm, contribution:diversificationNorm*0.15 },
      { key:'goals', label:'Goal Progress', weight:0.20, raw:goalProgressNorm, normalized:goalProgressNorm, contribution:goalProgressNorm*0.20 },
      { key:'recurring', label:'Recurring Balance', weight:0.15, raw:recurringPct, normalized:recurringNorm, contribution:recurringNorm*0.15 },
    ];

    const score = clamp(breakdown.reduce((s,b)=>s+b.contribution,0));
    const grade = score>=85?'A': score>=70?'B': score>=55?'C': score>=40?'D':'E';

    return { score, grade, breakdown, generatedAt: new Date().toISOString() };
  }
}

export const wellbeingScoreService = WellbeingScoreService;
