-- =============================================================
-- v_assets_rank
--   Full ranking view — all assets with latest scores.
--   Extra metadata columns (logo_url, website, etc.) are
--   returned as NULL until an enrichment table is added.
-- =============================================================
create or replace view v_assets_rank as
select
  a.symbol,
  a.name,
  a.asset_type,
  a.racional_url,
  a.logo_url,
  a.website,
  a.sector,
  a.industry,
  a.country,
  a.description,
  s.date,
  s.final_score,
  s.bucket,
  s.mom_1w,
  s.mom_1m,
  s.mom_3m,
  s.mom_6m,
  s.mom_1y,
  s.rs_spy,
  s.tech_trend,
  s.liq_score
from assets a
join scores_daily s on s.symbol = a.symbol
where a.is_active = true
  and s.date = (select max(date) from scores_daily)
order by s.final_score desc nulls last;

-- =============================================================
-- v_compounders_*
--   CAGR screener views for 1Y, 3Y, 5Y horizons.
--   CAGR = (last_close / first_close) ^ (365 / days_covered) - 1
--   pos_month_ratio = fraction of calendar months with positive return
--   max_drawdown    = worst peak-to-trough over the window (negative)
-- =============================================================
create or replace view v_compounders_1y as
with bounds as (
  select symbol,
    min(date)   as start_date,
    max(date)   as end_date
  from prices_daily
  where date >= (select max(date) - interval '365 days' from prices_daily)
  group by symbol
),
first_last as (
  select distinct on (p.symbol)
    p.symbol,
    first_value(p.close) over w as first_close,
    last_value(p.close)  over w as last_close,
    count(*)             over w as data_points,
    (max(p.date) over w - min(p.date) over w) as days_covered
  from prices_daily p
  join bounds b on b.symbol = p.symbol
    and p.date between b.start_date and b.end_date
  window w as (partition by p.symbol order by p.date
               rows between unbounded preceding and unbounded following)
  order by p.symbol, p.date desc
),
monthly as (
  select
    symbol,
    date_trunc('month', date) as month,
    first_value(close) over (partition by symbol, date_trunc('month', date)
                             order by date rows between unbounded preceding and unbounded following) as open_m,
    last_value(close)  over (partition by symbol, date_trunc('month', date)
                             order by date rows between unbounded preceding and unbounded following) as close_m
  from prices_daily
  where date >= (select max(date) - interval '365 days' from prices_daily)
),
monthly_agg as (
  select symbol,
    count(distinct month)                                                             as total_months,
    count(distinct month) filter (where close_m > open_m)                            as pos_months
  from monthly
  group by symbol
),
drawdown_base as (
  select symbol, date, close,
    max(close) over (partition by symbol order by date
                     rows between unbounded preceding and current row) as running_max
  from prices_daily
  where date >= (select max(date) - interval '365 days' from prices_daily)
),
drawdown as (
  select symbol,
    min(close / nullif(running_max, 0) - 1.0) as max_drawdown
  from drawdown_base
  group by symbol
)
select
  a.symbol, a.name, a.asset_type, a.racional_url,
  fl.first_close,
  fl.last_close,
  case
    when fl.days_covered > 0 and fl.first_close > 0
    then power(fl.last_close::float / fl.first_close::float,
               365.0 / greatest(fl.days_covered::float, 1.0)) - 1.0
    else null
  end as cagr_1y,
  null::float as cagr_3y,
  null::float as cagr_5y,
  ma.pos_months::float / nullif(ma.total_months::float, 0.0) as pos_month_ratio,
  dd.max_drawdown,
  fl.days_covered
from first_last fl
join assets a on a.symbol = fl.symbol
left join monthly_agg ma on ma.symbol = fl.symbol
left join drawdown dd on dd.symbol = fl.symbol
where a.is_active = true
  and fl.first_close > 0
order by cagr_1y desc nulls last;

create or replace view v_compounders_3y as
with bounds as (
  select symbol,
    min(date)   as start_date,
    max(date)   as end_date
  from prices_daily
  where date >= (select max(date) - interval '3 years' from prices_daily)
  group by symbol
),
first_last as (
  select distinct on (p.symbol)
    p.symbol,
    first_value(p.close) over w as first_close,
    last_value(p.close)  over w as last_close,
    (max(p.date) over w - min(p.date) over w) as days_covered
  from prices_daily p
  join bounds b on b.symbol = p.symbol
    and p.date between b.start_date and b.end_date
  window w as (partition by p.symbol order by p.date
               rows between unbounded preceding and unbounded following)
  order by p.symbol, p.date desc
),
monthly as (
  select
    symbol,
    date_trunc('month', date) as month,
    first_value(close) over (partition by symbol, date_trunc('month', date)
                             order by date rows between unbounded preceding and unbounded following) as open_m,
    last_value(close)  over (partition by symbol, date_trunc('month', date)
                             order by date rows between unbounded preceding and unbounded following) as close_m
  from prices_daily
  where date >= (select max(date) - interval '3 years' from prices_daily)
),
monthly_agg as (
  select symbol,
    count(distinct month)                                                  as total_months,
    count(distinct month) filter (where close_m > open_m)                 as pos_months
  from monthly
  group by symbol
),
drawdown_base as (
  select symbol, date, close,
    max(close) over (partition by symbol order by date
                     rows between unbounded preceding and current row) as running_max
  from prices_daily
  where date >= (select max(date) - interval '3 years' from prices_daily)
),
drawdown as (
  select symbol,
    min(close / nullif(running_max, 0) - 1.0) as max_drawdown
  from drawdown_base
  group by symbol
)
select
  a.symbol, a.name, a.asset_type, a.racional_url,
  fl.first_close,
  fl.last_close,
  null::float as cagr_1y,
  case
    when fl.days_covered > 0 and fl.first_close > 0
    then power(fl.last_close::float / fl.first_close::float,
               365.0 / greatest(fl.days_covered::float, 1.0)) - 1.0
    else null
  end as cagr_3y,
  null::float as cagr_5y,
  ma.pos_months::float / nullif(ma.total_months::float, 0.0) as pos_month_ratio,
  dd.max_drawdown,
  fl.days_covered
from first_last fl
join assets a on a.symbol = fl.symbol
left join monthly_agg ma on ma.symbol = fl.symbol
left join drawdown dd on dd.symbol = fl.symbol
where a.is_active = true
  and fl.first_close > 0
order by cagr_3y desc nulls last;

create or replace view v_compounders_5y as
with bounds as (
  select symbol,
    min(date)   as start_date,
    max(date)   as end_date
  from prices_daily
  where date >= (select max(date) - interval '5 years' from prices_daily)
  group by symbol
),
first_last as (
  select distinct on (p.symbol)
    p.symbol,
    first_value(p.close) over w as first_close,
    last_value(p.close)  over w as last_close,
    (max(p.date) over w - min(p.date) over w) as days_covered
  from prices_daily p
  join bounds b on b.symbol = p.symbol
    and p.date between b.start_date and b.end_date
  window w as (partition by p.symbol order by p.date
               rows between unbounded preceding and unbounded following)
  order by p.symbol, p.date desc
),
monthly as (
  select
    symbol,
    date_trunc('month', date) as month,
    first_value(close) over (partition by symbol, date_trunc('month', date)
                             order by date rows between unbounded preceding and unbounded following) as open_m,
    last_value(close)  over (partition by symbol, date_trunc('month', date)
                             order by date rows between unbounded preceding and unbounded following) as close_m
  from prices_daily
  where date >= (select max(date) - interval '5 years' from prices_daily)
),
monthly_agg as (
  select symbol,
    count(distinct month)                                                  as total_months,
    count(distinct month) filter (where close_m > open_m)                 as pos_months
  from monthly
  group by symbol
),
drawdown_base as (
  select symbol, date, close,
    max(close) over (partition by symbol order by date
                     rows between unbounded preceding and current row) as running_max
  from prices_daily
  where date >= (select max(date) - interval '5 years' from prices_daily)
),
drawdown as (
  select symbol,
    min(close / nullif(running_max, 0) - 1.0) as max_drawdown
  from drawdown_base
  group by symbol
)
select
  a.symbol, a.name, a.asset_type, a.racional_url,
  fl.first_close,
  fl.last_close,
  null::float as cagr_1y,
  null::float as cagr_3y,
  case
    when fl.days_covered > 0 and fl.first_close > 0
    then power(fl.last_close::float / fl.first_close::float,
               365.0 / greatest(fl.days_covered::float, 1.0)) - 1.0
    else null
  end as cagr_5y,
  ma.pos_months::float / nullif(ma.total_months::float, 0.0) as pos_month_ratio,
  dd.max_drawdown,
  fl.days_covered
from first_last fl
join assets a on a.symbol = fl.symbol
left join monthly_agg ma on ma.symbol = fl.symbol
left join drawdown dd on dd.symbol = fl.symbol
where a.is_active = true
  and fl.first_close > 0
order by cagr_5y desc nulls last;

-- =============================================================
-- v_invest_candidates (original — kept for backwards compat)
-- =============================================================
create or replace view v_invest_candidates as
select
  a.symbol,
  a.name,
  a.asset_type,
  s.date,
  s.final_score,
  s.bucket,
  s.mom_1w,
  s.mom_1m,
  s.rs_spy,
  s.tech_trend,
  s.liq_score
from assets a
join scores_daily s on s.symbol = a.symbol
where s.date = (select max(date) from scores_daily)
  and s.bucket = 'Alta Convicción'
  and s.mom_1m > 0
  and s.mom_1w > 0
  and s.rs_spy > 0
  and s.liq_score > 0.5
  and s.tech_trend >= 1.0  -- o ajusta a 1.5 si lo normalizas así
order by s.final_score desc;
