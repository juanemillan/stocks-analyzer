'use server';

import pool from '@/lib/db';

// pg returns numeric columns as strings; coerce them back to numbers
function parseRow(row: Record<string, unknown>) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
        result[k] = typeof v === 'string' && v !== '' && !isNaN(Number(v)) ? Number(v) : v;
    }
    return result;
}

export async function getRanking() {
    const { rows } = await pool.query('SELECT * FROM v_assets_rank ORDER BY final_score DESC NULLS LAST');
    return rows.map(parseRow);
}

export async function getTurnarounds() {
    const { rows } = await pool.query('SELECT * FROM v_turnaround_candidates ORDER BY rebound_from_low DESC NULLS LAST');
    return rows.map(parseRow);
}

export async function getCompounders(horizon: '1Y' | '3Y' | '5Y') {
    const view =
        horizon === '1Y'
            ? 'v_compounders_1y'
            : horizon === '3Y'
                ? 'v_compounders_3y'
                : 'v_compounders_5y';
    const { rows } = await pool.query(`SELECT * FROM ${view}`);
    return rows.map(parseRow);
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

export async function getAccumulationZone() {
    const { rows } = await pool.query('SELECT * FROM v_accumulation_zone');
    return rows.map(parseRow);
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
