const targets = [
  { ticker: "PZU", market: "GPW", provider: "Stooq" },
  { ticker: "XTB", market: "GPW", provider: "Stooq" },
  { ticker: "DVL", market: "GPW", provider: "Stooq" },
  { ticker: "ABE", market: "GPW", provider: "Stooq" },
  { ticker: "MSFT", market: "USA", provider: "Massive" },
  { ticker: "V", market: "USA", provider: "Massive" },
  { ticker: "EME", market: "USA", provider: "Massive" },
  { ticker: "FIX", market: "USA", provider: "Massive" },
];

const massiveApiKey = process.env.MASSIVE_API_KEY;

function compactDate(date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

async function stooqQuote(ticker) {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 14);
  const url = new URL("https://stooq.com/q/d/l/");
  url.search = new URLSearchParams({
    s: ticker.toLowerCase(),
    d1: compactDate(from),
    d2: compactDate(to),
    i: "d",
  }).toString();
  const response = await fetch(url, {
    headers: { Accept: "text/csv,text/plain" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = (await response.text()).trim();
  const lines = payload.split(/\r?\n/);
  if (lines[0] !== "Date,Open,High,Low,Close,Volume" || lines.length < 2) {
    throw new Error("invalid CSV response");
  }
  const values = lines.at(-1).split(",");
  if (
    values.length !== 6 ||
    values.some((value) => !value || value === "N/D")
  ) {
    throw new Error("invalid EOD row");
  }
  return {
    providerSymbol: ticker,
    price: values[4],
    currency: "PLN",
    asOf: values[0],
    volume: values[5],
  };
}

async function massiveQuote(ticker) {
  if (!massiveApiKey) throw new Error("MASSIVE_API_KEY unavailable");
  const url = new URL(
    `/v2/aggs/ticker/${encodeURIComponent(ticker)}/prev`,
    "https://api.massive.com",
  );
  url.search = new URLSearchParams({
    adjusted: "true",
    apiKey: massiveApiKey,
  }).toString();
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  const row = payload?.results?.[0];
  if (
    payload?.status !== "OK" ||
    row?.T !== ticker ||
    !Number.isFinite(row?.c) ||
    !Number.isFinite(row?.t)
  ) {
    throw new Error("invalid EOD response");
  }
  return {
    providerSymbol: ticker,
    price: row.c,
    currency: "USD",
    asOf: new Date(row.t).toISOString().slice(0, 10),
    volume: row.v ?? null,
  };
}

const results = [];
let massiveRequests = 0;
for (const target of targets) {
  try {
    if (target.provider === "Massive" && massiveRequests > 0) {
      await new Promise((resolve) => setTimeout(resolve, 12_100));
    }
    const quote =
      target.provider === "Stooq"
        ? await stooqQuote(target.ticker)
        : await massiveQuote(target.ticker);
    if (target.provider === "Massive") massiveRequests += 1;
    results.push({
      Ticker: target.ticker,
      Market: target.market,
      Provider: target.provider,
      "Provider Symbol": quote.providerSymbol,
      Price: quote.price,
      Currency: quote.currency,
      "As Of": quote.asOf,
      Volume: quote.volume,
      Result: "PASS",
      Notes: "EOD OHLCV available",
    });
  } catch (error) {
    if (target.provider === "Massive" && massiveApiKey) massiveRequests += 1;
    results.push({
      Ticker: target.ticker,
      Market: target.market,
      Provider: target.provider,
      "Provider Symbol": target.ticker,
      Price: null,
      Currency: target.market === "GPW" ? "PLN" : "USD",
      "As Of": null,
      Volume: null,
      Result: "NOT VERIFIED",
      Notes: error instanceof Error ? error.message : "unknown error",
    });
  }
}

console.table(results);

try {
  const response = await fetch(
    "https://api.nbp.pl/api/exchangerates/rates/a/usd/?format=json",
    {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    },
  );
  const payload = await response.json();
  const rate = payload?.rates?.[0];
  console.log("NBP USD/PLN", {
    effectiveDate: rate?.effectiveDate ?? null,
    rate: rate?.mid ?? null,
    result: response.ok && Number.isFinite(rate?.mid) ? "PASS" : "FAIL",
  });
} catch {
  console.log("NBP USD/PLN", { result: "NOT VERIFIED" });
}

if (results.some((result) => result.Result !== "PASS")) process.exitCode = 2;
