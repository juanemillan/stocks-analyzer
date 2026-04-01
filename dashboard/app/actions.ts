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
