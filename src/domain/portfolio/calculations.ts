export type PortfolioLot = {
  quantity: string;
  pricePerShare: string;
};

export type PositionMetrics = {
  totalQuantity: string;
  totalCostBasis: string;
  averagePurchasePrice: string;
  currentValue: string | null;
  profitLoss: string | null;
  profitLossPercent: string | null;
};

export type PortfolioValuationInput = {
  currency: "PLN" | "USD";
  totalCostBasis: string;
  currentValue: string | null;
};

export type PortfolioSummaryMetrics = {
  totalCostBasisPln: string | null;
  currentValuePln: string | null;
  profitLossPln: string | null;
  returnPercent: string | null;
};

type Decimal = { coefficient: bigint; scale: number };

const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);
const TEN = BigInt(10);

function powerOfTen(exponent: number) {
  return TEN ** BigInt(exponent);
}

function decimal(value: string): Decimal {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) throw new Error(`Invalid decimal value: ${value}`);
  const fraction = match[3] ?? "";
  const sign = match[1] === "-" ? -ONE : ONE;
  return {
    coefficient: sign * BigInt(`${match[2]}${fraction}`),
    scale: fraction.length,
  };
}

function add(left: Decimal, right: Decimal): Decimal {
  const scale = Math.max(left.scale, right.scale);
  return {
    coefficient:
      left.coefficient * powerOfTen(scale - left.scale) +
      right.coefficient * powerOfTen(scale - right.scale),
    scale,
  };
}

function subtract(left: Decimal, right: Decimal): Decimal {
  return add(left, { coefficient: -right.coefficient, scale: right.scale });
}

function multiply(left: Decimal, right: Decimal): Decimal {
  return {
    coefficient: left.coefficient * right.coefficient,
    scale: left.scale + right.scale,
  };
}

function divide(left: Decimal, right: Decimal, scale: number): Decimal {
  if (right.coefficient === ZERO) throw new Error("Cannot divide by zero.");
  const numerator = left.coefficient * powerOfTen(right.scale + scale);
  const denominator = right.coefficient * powerOfTen(left.scale);
  const negative = numerator < ZERO !== denominator < ZERO;
  const absoluteNumerator = numerator < ZERO ? -numerator : numerator;
  const absoluteDenominator = denominator < ZERO ? -denominator : denominator;
  let quotient = absoluteNumerator / absoluteDenominator;
  const remainder = absoluteNumerator % absoluteDenominator;
  if (remainder * TWO >= absoluteDenominator) quotient += ONE;
  return { coefficient: negative ? -quotient : quotient, scale };
}

function serialize(value: Decimal) {
  const negative = value.coefficient < ZERO;
  const absolute = negative ? -value.coefficient : value.coefficient;
  const padded = absolute.toString().padStart(value.scale + 1, "0");
  const integer =
    value.scale === 0 ? padded : padded.slice(0, padded.length - value.scale);
  const fraction =
    value.scale === 0 ? "" : padded.slice(padded.length - value.scale);
  const trimmedFraction = fraction.replace(/0+$/, "");
  const result = trimmedFraction ? `${integer}.${trimmedFraction}` : integer;
  return `${negative && result !== "0" ? "-" : ""}${result}`;
}

function percentage(delta: Decimal, basis: Decimal) {
  return divide(multiply(delta, decimal("100")), basis, 4);
}

export function calculatePosition(
  lots: PortfolioLot[],
  currentMarketPrice: string | null,
): PositionMetrics {
  if (lots.length === 0)
    throw new Error("A position requires at least one lot.");

  let totalQuantity = decimal("0");
  let totalCostBasis = decimal("0");
  for (const lot of lots) {
    const quantity = decimal(lot.quantity);
    const price = decimal(lot.pricePerShare);
    totalQuantity = add(totalQuantity, quantity);
    totalCostBasis = add(totalCostBasis, multiply(price, quantity));
  }

  const averagePurchasePrice = divide(totalCostBasis, totalQuantity, 6);
  if (currentMarketPrice === null) {
    return {
      totalQuantity: serialize(totalQuantity),
      totalCostBasis: serialize(totalCostBasis),
      averagePurchasePrice: serialize(averagePurchasePrice),
      currentValue: null,
      profitLoss: null,
      profitLossPercent: null,
    };
  }

  const currentValue = multiply(decimal(currentMarketPrice), totalQuantity);
  const profitLoss = subtract(currentValue, totalCostBasis);
  return {
    totalQuantity: serialize(totalQuantity),
    totalCostBasis: serialize(totalCostBasis),
    averagePurchasePrice: serialize(averagePurchasePrice),
    currentValue: serialize(currentValue),
    profitLoss: serialize(profitLoss),
    profitLossPercent: serialize(percentage(profitLoss, totalCostBasis)),
  };
}

export function calculatePortfolioSummary(
  positions: PortfolioValuationInput[],
  usdPlnRate: string | null,
): PortfolioSummaryMetrics {
  if (positions.length === 0) {
    return {
      totalCostBasisPln: "0",
      currentValuePln: "0",
      profitLossPln: "0",
      returnPercent: "0",
    };
  }

  let totalCostBasisPln = decimal("0");
  let currentValuePln = decimal("0");
  let completeCostBasis = true;
  let completeCurrentValue = true;

  for (const position of positions) {
    const rate =
      position.currency === "USD"
        ? usdPlnRate === null
          ? null
          : decimal(usdPlnRate)
        : decimal("1");
    if (rate === null) {
      completeCostBasis = false;
      completeCurrentValue = false;
      continue;
    }

    totalCostBasisPln = add(
      totalCostBasisPln,
      multiply(decimal(position.totalCostBasis), rate),
    );
    if (position.currentValue === null) {
      completeCurrentValue = false;
    } else {
      currentValuePln = add(
        currentValuePln,
        multiply(decimal(position.currentValue), rate),
      );
    }
  }

  if (!completeCostBasis) {
    return {
      totalCostBasisPln: null,
      currentValuePln: null,
      profitLossPln: null,
      returnPercent: null,
    };
  }

  if (!completeCurrentValue) {
    return {
      totalCostBasisPln: serialize(totalCostBasisPln),
      currentValuePln: null,
      profitLossPln: null,
      returnPercent: null,
    };
  }

  const profitLossPln = subtract(currentValuePln, totalCostBasisPln);
  return {
    totalCostBasisPln: serialize(totalCostBasisPln),
    currentValuePln: serialize(currentValuePln),
    profitLossPln: serialize(profitLossPln),
    returnPercent: serialize(percentage(profitLossPln, totalCostBasisPln)),
  };
}
