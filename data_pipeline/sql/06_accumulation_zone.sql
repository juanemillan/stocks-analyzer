-- v_accumulation_zone: early-stage turnaround candidates
-- Catches stocks near multi-year lows with first signs of accumulation,
-- BEFORE the +100% confirmation required by v_turnaround_candidates.
create or replace view v_accumulation_zone as
with px as (
  select p.*
  from prices_daily p
  where p.date >= (select max(date) - interval '370 days' from prices_daily)
),
base as (
  select
    symbol, date, close, volume,
    lag(close) over (partition by symbol order by date) as prev_close
  from px
),
enriched as (
  select
    symbol, date, close, volume, prev_close,
    max(close)  over (partition by symbol order by date rows between 251 preceding and current row) as max_52w,
    min(close)  over (partition by symbol order by date rows between 251 preceding and current row) as min_52w,
    avg(close)  over (partition by symbol order by date rows between 49  preceding and current row) as sma50,
    avg(volume) over (partition by symbol order by date rows between 49  preceding and current row) as avg_vol50,
    avg(volume) over (partition by symbol order by date rows between 4   preceding and current row) as avg_vol5,
    avg(volume) over (partition by symbol order by date rows between 19  preceding and current row) as avg_vol20,
    (close / lag(close, 5)   over (partition by symbol order by date) - 1.0) as mom_1w,
    (close / lag(close, 21)  over (partition by symbol order by date) - 1.0) as mom_1m,
    (close / lag(close, 63)  over (partition by symbol order by date) - 1.0) as mom_3m
  from base
),
last_row as (
  select distinct on (symbol)
    symbol, date, close,
    max_52w, min_52w, sma50,
    avg_vol50, avg_vol5, avg_vol20,
    mom_1w, mom_1m, mom_3m
  from enriched
  order by symbol, date desc
)
select
  a.symbol,
  a.name,
  a.asset_type,
  a.racional_url,
  lr.date,
  lr.close,
  -- how far above the 52w low (0 = at the low, 0.5 = 50% above)
  (lr.close / nullif(lr.min_52w, 0) - 1.0)                        as pct_above_52w_low,
  -- how far below the 52w high (negative: -0.6 means 60% below peak)
  (lr.close / nullif(lr.max_52w, 0) - 1.0)                        as pct_from_52w_high,
  lr.mom_1w,
  lr.mom_1m,
  lr.mom_3m,
  -- vol surge vs 50-day baseline (catches early accumulation)
  (lr.avg_vol5 / nullif(lr.avg_vol50, 0))                         as vol_surge,
  case
    when lr.avg_vol20 >= 200000 then 1.0
    when lr.avg_vol20 is null   then 0.0
    else greatest(0.0, least(1.0, (lr.avg_vol20::float - 50000.0) / 150000.0))
  end as liq_score
from last_row lr
join assets a on a.symbol = lr.symbol
where
  lr.min_52w is not null
  and lr.max_52w is not null
  -- still beaten down from highs (fallen angel quality)
  and (lr.close / nullif(lr.max_52w, 0) - 1.0) <= -0.40
  -- near 52w low: 0–50% above it (not yet confirmed turnaround)
  and (lr.close / nullif(lr.min_52w, 0) - 1.0) between 0.0 and 0.50
  -- first positive tick: at least weekly OR monthly momentum turning up
  and (lr.mom_1w > 0 or lr.mom_1m > 0)
  -- not in freefall
  and (lr.mom_1m is null or lr.mom_1m > -0.35)
  -- early accumulation signal: volume surge vs 50-day baseline
  and (lr.avg_vol5 / nullif(lr.avg_vol50, 0)) >= 1.3
  -- minimum price & liquidity filters
  and lr.close >= 0.50
  and lr.avg_vol20 >= 50000
order by vol_surge desc, pct_above_52w_low asc;
