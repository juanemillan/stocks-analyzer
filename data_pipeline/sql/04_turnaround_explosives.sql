create or replace view v_turnaround_candidates as
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
    min(close)  over (partition by symbol order by date rows between 251 preceding and current row) as min_52w,
    avg(close)  over (partition by symbol order by date rows between 49  preceding and current row) as sma50,
    avg(volume) over (partition by symbol order by date rows between 19  preceding and current row) as avg_vol20,
    avg(volume) over (partition by symbol order by date rows between 4   preceding and current row) as avg_vol5,
    (close/lag(close,21) over (partition by symbol order by date) - 1.0) as mom_1m,
    (close/lag(close,63) over (partition by symbol order by date) - 1.0) as mom_3m,
    (close/lag(close, 126) over (partition by symbol order by date) - 1.0) as mom_6m,
    (close/lag(close, 252) over (partition by symbol order by date) - 1.0) as mom_1y

  from base
),
last_row as (
  select distinct on (symbol)
    symbol, date, close, sma50, avg_vol20, avg_vol5, min_52w, mom_1m, mom_3m
  from enriched
  order by symbol, date desc
)
select
  a.symbol, a.name, a.asset_type, a.racional_url,
  lr.date,
  lr.close,
  (lr.close / nullif(lr.min_52w,0) - 1.0)           as rebound_from_low,
  lr.mom_1m, lr.mom_3m,
  (lr.avg_vol5 / nullif(lr.avg_vol20,0))            as vol_surge,
  case
    when lr.avg_vol20 >= 200000 then 1.0
    when lr.avg_vol20 is null then 0.0
    else greatest(0.0, least(1.0, (lr.avg_vol20::float - 100000.0) / 1900000.0))
  end as liq_score,
  case when lr.close > coalesce(lr.sma50, lr.close-1) then 1 else 0 end as above_sma50
from last_row lr
join assets a on a.symbol = lr.symbol
where
  lr.min_52w is not null
  and (lr.close / lr.min_52w) - 1.0 >= 1.0              -- +100% desde mínimo 52w
  and (lr.mom_1m >= 0.20 or lr.mom_3m >= 0.50)          -- momentum fuerte
  and (lr.avg_vol5 / nullif(lr.avg_vol20,0)) >= 2.0     -- volumen en alza
  and lr.avg_vol20 >= 200000                             -- liquidez mínima
  and lr.close > 1.0                                     -- sin penny stocks extremos
order by rebound_from_low desc, vol_surge desc;
