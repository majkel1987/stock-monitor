const targets = [
  { ticker: "PZU", market: "GPW", suffix: ".WAR" },
  { ticker: "XTB", market: "GPW", suffix: ".WAR" },
  { ticker: "DVL", market: "GPW", suffix: ".WAR" },
  { ticker: "ABE", market: "GPW", suffix: ".WAR" },
  { ticker: "MSFT", market: "USA", suffix: ".US" },
  { ticker: "V", market: "USA", suffix: ".US" },
  { ticker: "EME", market: "USA", suffix: ".US" },
  { ticker: "FIX", market: "USA", suffix: ".US" },
];

const token = process.env.EODHD_API_TOKEN;
if (!token) {
  console.log("Provider spike: NOT RUN");
  console.log("Reason: EODHD_API_TOKEN unavailable");
  process.exitCode = 2;
} else {
  const baseUrl = "https://eodhd.com/api";

  async function get(path, params = {}) {
    const url = new URL(`${baseUrl}${path}`);
    url.searchParams.set("api_token", token);
    url.searchParams.set("fmt", "json");
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      throw new Error(`EODHD request failed with HTTP ${response.status}`);
    }
    return response.json();
  }

  const results = [];
  for (const target of targets) {
    try {
      const search = await get(`/search/${encodeURIComponent(target.ticker)}`, {
        limit: "20",
      });
      const candidates = Array.isArray(search) ? search : [];
      const candidate = candidates.find(
        (item) =>
          typeof item?.Code === "string" &&
          item.Code.toUpperCase() === `${target.ticker}${target.suffix}`,
      );
      if (!candidate) {
        results.push({
          ticker: target.ticker,
          market: target.market,
          search: "missing",
          providerSymbol: "missing",
          error: "Exact expected listing was not returned by provider search.",
        });
        continue;
      }

      const quote = await get(
        `/real-time/${encodeURIComponent(candidate.Code)}`,
      );
      const field = (value) =>
        value === null || value === undefined ? "missing" : "available";
      results.push({
        ticker: target.ticker,
        market: target.market,
        search: "available",
        providerSymbol: candidate.Code,
        price: field(quote?.close),
        currency: field(candidate.Currency),
        timestamp: field(quote?.timestamp),
        previousClose: field(quote?.previousClose),
        dailyChange: field(quote?.change_p),
        volume: field(quote?.volume),
        fiftyTwoWeekHigh: "missing from real-time endpoint",
        fiftyTwoWeekLow: "missing from real-time endpoint",
        marketCap: "missing from real-time endpoint",
      });
    } catch (error) {
      results.push({
        ticker: target.ticker,
        market: target.market,
        search: "unexpected",
        error:
          error instanceof Error ? error.message : "Unknown provider error",
      });
    }
  }

  console.table(results);
  if (results.some((result) => result.error)) process.exitCode = 1;
}
