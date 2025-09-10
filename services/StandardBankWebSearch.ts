/**
 * StandardBank Web Search (client-side best-effort)
 * Lightweight utilities to fetch or approximate real-time Standard Bank info.
 * Note: Real websites often block cross-origin requests from apps.
 * In such cases we return a friendly fallback with suggested proxy options.
 */

export interface SBSearchResult {
  timestamp: string;
  query: string;
  source: string;
  snippets: string[];
  note?: string;
}

const SB_HOST = 'https://www.standardbank.co.za';

async function safeFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return null;
    const text = await res.text();
    return text;
  } catch (e) {
    return null;
  }
}

function extractSnippets(html: string, max = 3): string[] {
  const snippets: string[] = [];
  try {
    // Very naive text extraction: strip tags and find headings/lines
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Pull some interesting phrases (interest rates, fees, accounts)
    const patterns = [
      /(interest\s*rate[^.]*\.)/i,
      /(monthly\s*fee[^.]*\.)/i,
      /(account[^.]*benefit[^.]*\.)/i,
      /(savings\s*account[^.]*\.)/i,
      /(cheque\s*account[^.]*\.)/i,
      /(loan[^.]*rate[^.]*\.)/i,
    ];

    for (const p of patterns) {
      const m = text.match(p);
      if (m && m[1]) snippets.push(m[1]);
      if (snippets.length >= max) break;
    }

    if (snippets.length === 0) {
      snippets.push(text.slice(0, 200) + '...');
    }
  } catch {}
  return snippets.slice(0, max);
}

export async function searchStandardBank(query: string): Promise<SBSearchResult> {
  // Try a couple of likely pages
  const urls = [
    `${SB_HOST}/south-africa/personal/products-and-services/save-and-invest`,
    `${SB_HOST}/south-africa/personal/products-and-services/bank-with-us` ,
    `${SB_HOST}/south-africa/personal/products-and-services/borrow-for-your-needs`
  ];

  const results: string[] = [];
  for (const u of urls) {
    const html = await safeFetch(u);
    if (html) results.push(...extractSnippets(html));
  }

  if (results.length > 0) {
    return {
      timestamp: new Date().toISOString(),
      query,
      source: 'standardbank.co.za',
      snippets: results.slice(0, 5)
    };
  }

  // Fallback when CORS blocks direct access
  return {
    timestamp: new Date().toISOString(),
    query,
    source: 'standardbank.co.za',
    snippets: [
      'Could not fetch live data directly from Standard Bank site due to CORS. Using cached examples:',
      'Savings accounts typically advertise competitive annual interest rates and no/low monthly fees.',
      'Cheque accounts often include unlimited transactions on higher-tier packages with monthly fees.',
      'Loan products disclose variable interest rates depending on credit profile and term.'
    ],
    note: 'For true real-time data, consider adding a small server proxy that fetches and sanitizes pages for the app.'
  };
}

export async function getStandardBankRates(): Promise<SBSearchResult> {
  const url = `${SB_HOST}/south-africa/personal/insights/interest-rates`;
  const html = await safeFetch(url);
  if (html) {
    return {
      timestamp: new Date().toISOString(),
      query: 'interest rates',
      source: 'standardbank.co.za',
      snippets: extractSnippets(html)
    };
  }
  return {
    timestamp: new Date().toISOString(),
    query: 'interest rates',
    source: 'standardbank.co.za',
    snippets: [
      'Live rates unavailable client-side. Use proxy for guaranteed access.',
    ],
    note: 'Consider server-side proxy for scraping financial rates.'
  };
}

export default { searchStandardBank, getStandardBankRates };
