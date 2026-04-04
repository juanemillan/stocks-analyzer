'use server';

import pool from '@/lib/db';
import http from 'node:http';
import { Resend } from 'resend';
import { unstable_cache } from 'next/cache';

// Shared ranking data re-fetched at most once per 2 hours.
// All users get the same result from the cache; only one DB hit per TTL window.
// Data updates once daily via the pipeline; 2h TTL = ≤12 DB hits/day worst case.
const RANKING_TTL = 7200; // 2 hours in seconds

// pg returns numeric columns as strings; coerce them back to numbers
function parseRow(row: Record<string, unknown>) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
        result[k] = typeof v === 'string' && v !== '' && !isNaN(Number(v)) ? Number(v) : v;
    }
    return result;
}

export async function requestAsset(
    userId: string,
    symbol: string,
    reason: string,
): Promise<void> {
    await pool.query(
        `INSERT INTO asset_requests (user_id, symbol, reason)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [userId, symbol.toUpperCase(), reason || null],
    );

    // Send email notification to the admin if Resend is configured
    const resendKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!resendKey) {
        console.warn('[requestAsset] RESEND_API_KEY not set — skipping email');
    } else if (!adminEmail) {
        console.warn('[requestAsset] ADMIN_EMAIL not set — skipping email');
    } else {
        try {
            const resend = new Resend(resendKey);
            const result = await resend.emails.send({
                from: 'Stocks Analyzer <onboarding@resend.dev>',
                to: adminEmail,
                subject: `[Stocks Analyzer] Asset request: ${symbol.toUpperCase()}`,
                html: `
                    <h2>New asset request</h2>
                    <p><strong>Symbol:</strong> ${symbol.toUpperCase()}</p>
                    <p><strong>Reason:</strong> ${reason || '(no reason provided)'}</p>
                    <p><strong>User ID:</strong> ${userId}</p>
                    <hr/>
                    <p style="color:#888;font-size:12px">Submitted via Stocks Analyzer dashboard</p>
                `,
            });
            if (result.error) {
                console.error('[requestAsset] Resend error:', result.error);
            } else {
                console.log('[requestAsset] Email sent, id:', result.data?.id);
            }
        } catch (err) {
            console.error('[requestAsset] Resend threw:', err);
        }
    }
}

export const getRanking = unstable_cache(
    async () => {
        const { rows } = await pool.query('SELECT * FROM v_assets_rank ORDER BY final_score DESC NULLS LAST');
        return rows.map(parseRow);
    },
    ['ranking'],
    { revalidate: RANKING_TTL },
);

export const getTurnarounds = unstable_cache(
    async () => {
        const { rows } = await pool.query('SELECT * FROM v_turnaround_candidates ORDER BY rebound_from_low DESC NULLS LAST');
        return rows.map(parseRow);
    },
    ['turnarounds'],
    { revalidate: RANKING_TTL },
);

const _getCompounders1Y = unstable_cache(
    async () => { const { rows } = await pool.query('SELECT * FROM v_compounders_1y'); return rows.map(parseRow); },
    ['compounders-1y'], { revalidate: RANKING_TTL },
);
const _getCompounders3Y = unstable_cache(
    async () => { const { rows } = await pool.query('SELECT * FROM v_compounders_3y'); return rows.map(parseRow); },
    ['compounders-3y'], { revalidate: RANKING_TTL },
);
const _getCompounders5Y = unstable_cache(
    async () => { const { rows } = await pool.query('SELECT * FROM v_compounders_5y'); return rows.map(parseRow); },
    ['compounders-5y'], { revalidate: RANKING_TTL },
);

export async function getCompounders(horizon: '1Y' | '3Y' | '5Y') {
    if (horizon === '1Y') return _getCompounders1Y();
    if (horizon === '3Y') return _getCompounders3Y();
    return _getCompounders5Y();
}

export async function getLatestPrices(symbols: string[]): Promise<Record<string, { price: number; date: string }>> {
    if (!symbols.length) return {};
    const { rows } = await pool.query(
        `SELECT DISTINCT ON (symbol) symbol, date::text AS date, close
         FROM prices_daily
         WHERE symbol = ANY($1::text[])
         ORDER BY symbol, date DESC`,
        [symbols]
    );
    const result: Record<string, { price: number; date: string }> = {};
    for (const row of rows) {
        result[row.symbol] = { price: Number(row.close), date: row.date };
    }
    return result;
}

export async function getPrices(symbol: string, days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { rows } = await pool.query(
        'SELECT date::text AS date, close FROM prices_daily WHERE symbol = $1 AND date >= $2 ORDER BY date ASC',
        [symbol, since.toISOString().slice(0, 10)]
    );
    return rows.map(parseRow);
}

export const getAccumulationZone = unstable_cache(
    async () => {
        const { rows } = await pool.query('SELECT * FROM v_accumulation_zone');
        return rows.map(parseRow);
    },
    ['accumulation'],
    { revalidate: RANKING_TTL },
);

export async function getPricesMulti(
    symbols: string[],
    days: number
): Promise<Record<string, { date: string; close: number }[]>> {
    if (!symbols.length) return {};
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { rows } = await pool.query(
        `SELECT symbol, date::text AS date, close
         FROM prices_daily
         WHERE symbol = ANY($1::text[])
           AND date >= $2
         ORDER BY symbol, date ASC`,
        [symbols, since.toISOString().slice(0, 10)]
    );
    const result: Record<string, { date: string; close: number }[]> = {};
    for (const row of rows) {
        if (!result[row.symbol]) result[row.symbol] = [];
        result[row.symbol].push({ date: row.date, close: Number(row.close) });
    }
    return result;
}

// ===== Finnhub =====
type FinnhubNewsItem = {
    headline: string;
    url: string;
    source: string;
    datetime: number;
};
type FinnhubRec = {
    buy: number;
    hold: number;
    sell: number;
    strongBuy: number;
    strongSell: number;
    period: string;
};
type FinnhubQuote = {
    c: number;   // current price
    h: number;   // high of day
    l: number;   // low of day
    o: number;   // open
    pc: number;  // previous close
    dp: number;  // % change
};
type FinnhubMetrics = {
    marketCapitalization: number | null;
    peBasicExclExtraTTM: number | null;
    ebitdaAnnual: number | null;
    dividendYieldIndicatedAnnual: number | null;
    revenueGrowthTTMYoy: number | null;
    epsBasicExclExtraItemsTTM: number | null;
    '52WeekHigh': number | null;
    '52WeekLow': number | null;
};

export async function getFinnhubData(symbol: string): Promise<{
    news: FinnhubNewsItem[];
    recommendation: FinnhubRec | null;
    quote: FinnhubQuote | null;
    metrics: FinnhubMetrics | null;
}> {
    const key = process.env.FINNHUB_API_KEY;
    if (!key) return { news: [], recommendation: null, quote: null, metrics: null };

    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 7);
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);

    const [newsRes, recRes, quoteRes, metricRes] = await Promise.all([
        fetch(
            `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${fromStr}&to=${toStr}&token=${key}`,
            { next: { revalidate: 300 } }
        ),
        fetch(
            `https://finnhub.io/api/v1/stock/recommendation?symbol=${encodeURIComponent(symbol)}&token=${key}`,
            { next: { revalidate: 300 } }
        ),
        fetch(
            `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`,
            { next: { revalidate: 60 } }
        ),
        fetch(
            `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${key}`,
            { next: { revalidate: 3600 } }
        ),
    ]);

    const news: FinnhubNewsItem[] = newsRes.ok ? (await newsRes.json()).slice(0, 5) : [];
    const recData = recRes.ok ? await recRes.json() : [];
    const recommendation: FinnhubRec | null = Array.isArray(recData) && recData.length > 0 ? recData[0] : null;
    const quoteData = quoteRes.ok ? await quoteRes.json() : null;
    const quote: FinnhubQuote | null = quoteData && quoteData.c ? quoteData : null;
    const metricData = metricRes.ok ? await metricRes.json() : null;
    const metrics: FinnhubMetrics | null = metricData?.metric ?? null;

    return { news, recommendation, quote, metrics };
}

// ===== Racional Portfolio Sync =====
export async function syncRacionalPortfolio(
    userId: string,
    email?: string,
    password?: string,
    replaceSold?: boolean,
): Promise<{ synced: number; holdings: unknown[] }> {
    const localApiUrl = (process.env.LOCAL_API_URL ?? 'http://localhost:8787').replace(/\/$/, '');
    const syncKey = process.env.SYNC_KEY;
    if (!syncKey) throw new Error('SYNC_KEY not set in .env.local');

    // Scraping 20+ assets takes several minutes — use node:http directly
    // to avoid undici's 30s headers timeout that fetch() cannot override.
    const TEN_MIN_MS = 10 * 60 * 1000;
    const { status, body: rawBody } = await new Promise<{ status: number; body: string }>(
        (resolve, reject) => {
            const payload = JSON.stringify({ user_id: userId, email, password, replace_sold: replaceSold ?? false });
            const url = new URL(`${localApiUrl}/sync-racional`);
            const req = http.request(
                {
                    hostname: url.hostname,
                    port: url.port || 80,
                    path: url.pathname,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Sync-Key': syncKey,
                        'Content-Length': Buffer.byteLength(payload),
                    },
                    timeout: TEN_MIN_MS,
                },
                (res) => {
                    let data = '';
                    res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
                    res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }));
                },
            );
            req.on('timeout', () => { req.destroy(); reject(new Error('Sync timed out after 10 minutes')); });
            req.on('error', reject);
            req.write(payload);
            req.end();
        },
    );

    if (status < 200 || status >= 300) {
        const detail = JSON.parse(rawBody)?.detail ?? `Racional sync failed (HTTP ${status})`;
        throw new Error(detail);
    }

    return JSON.parse(rawBody);
}
