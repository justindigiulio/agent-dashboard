"use client";
import React, { useState, useEffect } from "react";

const BuyerBudgetTool = () => {
  const [interestRate, setInterestRate] = useState(6.5); // default until fetched
  const [termYears, setTermYears] = useState(30);
  const [downPaymentPct, setDownPaymentPct] = useState(20);

  const [propertyType, setPropertyType] = useState<"coop" | "condo">("coop");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [maintenanceFee, setMaintenanceFee] = useState("");
  const [commonCharges, setCommonCharges] = useState("");
  const [realEstateTax, setRealEstateTax] = useState("");
  const [purchasePriceInput, setPurchasePriceInput] = useState("");

  const [resultPurchasePrice, setResultPurchasePrice] = useState<null | number>(null);
  const [resultMonthlyCost, setResultMonthlyCost] = useState<null | number>(null);

  // Fetch current 30‑year rate (example using FRED)
  useEffect(() => {
    (async () => {
      try {
        // You can replace this with any reliable API endpoint
        const resp = await fetch(
          "https://api.api-ninjas.com/v1/mortgagerate",
          { headers: { "X-Api-Key": process.env.NEXT_PUBLIC_API_NINJAS_KEY || "" } }
        );
        const data = await resp.json();
        if (data?.frm_30) setInterestRate(parseFloat(data.frm_30));
      } catch (e) {
        console.warn("Could not fetch mortgage rate:", e);
      }
    })();
  }, []);

  // Mortgage payment formula
  const monthlyPayment = (principal: number, annualRate: number, years: number) => {
    const n = years * 12;
    const r = annualRate / 100 / 12;
    return principal * r / (1 - Math.pow(1 + r, -n));
  };

  // Convert monthly budget → purchase price
  const computePurchasePrice = () => {
    const budget = parseFloat(monthlyBudget);
    if (!budget) return;
    // sum fees
    const fees =
      parseFloat(propertyType === "coop" ? maintenanceFee || "0" : (commonCharges || "0")) +
      parseFloat(propertyType === "condo" ? realEstateTax || "0" : "0");
    const mortgageBudget = budget - fees;
    const dpPct = downPaymentPct / 100;
    // Solve for principal P such that monthlyPayment(P, rate) = mortgageBudget
    const monthlyPaymentRate = interestRate / 100 / 12;
    const n = termYears * 12;
    const factor = monthlyPaymentRate / (1 - Math.pow(1 + monthlyPaymentRate, -n));
    const principal = mortgageBudget / factor;
    const purchasePrice = principal / (1 - dpPct);
    setResultPurchasePrice(purchasePrice);
  };

  // Convert purchase price → monthly cost
  const computeMonthlyCost = () => {
    const price = parseFloat(purchasePriceInput);
    if (!price) return;
    const dpPct = downPaymentPct / 100;
    const principal = price * (1 - dpPct);
    const mortgage = monthlyPayment(principal, interestRate, termYears);
    const fees =
      parseFloat(propertyType === "coop" ? maintenanceFee || "0" : (commonCharges || "0")) +
      parseFloat(propertyType === "condo" ? realEstateTax || "0" : "0");
    setResultMonthlyCost(mortgage + fees);
  };

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-bold">Buyer Budget Tool</h1>

      <div>
        <label className="block text-sm font-medium">Mortgage rate (30‑yr fixed %)</label>
        <input
          type="number"
          step="0.01"
          value={interestRate}
          onChange={(e) => setInterestRate(parseFloat(e.target.value))}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Loan term (years)</label>
          <input
            type="number"
            value={termYears}
            onChange={(e) => setTermYears(parseInt(e.target.value))}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Down payment %</label>
          <input
            type="number"
            value={downPaymentPct}
            onChange={(e) => setDownPaymentPct(parseFloat(e.target.value))}
            className="mt-1 w-full rounded border px-2 py-1"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">Property type</label>
        <select
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value as any)}
          className="mt-1 w-full rounded border px-2 py-1"
        >
          <option value="coop">Co-op</option>
          <option value="condo">Condo</option>
        </select>
      </div>

      {/* Input for monthly budget conversion */}
      <div className="border rounded p-4 space-y-2">
        <h2 className="font-semibold">Monthly budget → Purchase price</h2>
        <input
          type="number"
          value={monthlyBudget}
          onChange={(e) => setMonthlyBudget(e.target.value)}
          placeholder="Monthly budget ($)"
          className="w-full rounded border px-2 py-1"
        />
        {propertyType === "coop" ? (
          <input
            type="number"
            value={maintenanceFee}
            onChange={(e) => setMaintenanceFee(e.target.value)}
            placeholder="Maintenance fee ($)"
            className="w-full rounded border px-2 py-1"
          />
        ) : (
          <>
            <input
              type="number"
              value={commonCharges}
              onChange={(e) => setCommonCharges(e.target.value)}
              placeholder="Common charges ($)"
              className="w-full rounded border px-2 py-1"
            />
            <input
              type="number"
              value={realEstateTax}
              onChange={(e) => setRealEstateTax(e.target.value)}
              placeholder="Real estate tax ($)"
              className="w-full rounded border px-2 py-1"
            />
          </>
        )}
        <button
          type="button"
          onClick={computePurchasePrice}
          className="rounded bg-emerald-600 px-4 py-2 text-white"
        >
          Calculate Purchase Price
        </button>
        {resultPurchasePrice && (
          <div className="text-green-700">
            Estimated purchase price: ${resultPurchasePrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        )}
      </div>

      {/* Input for purchase price conversion */}
      <div className="border rounded p-4 space-y-2">
        <h2 className="font-semibold">Purchase price → Monthly cost</h2>
        <input
          type="number"
          value={purchasePriceInput}
          onChange={(e) => setPurchasePriceInput(e.target.value)}
          placeholder="Purchase price ($)"
          className="w-full rounded border px-2 py-1"
        />
        {propertyType === "coop" ? (
          <input
            type="number"
            value={maintenanceFee}
            onChange={(e) => setMaintenanceFee(e.target.value)}
            placeholder="Maintenance fee ($)"
            className="w-full rounded border px-2 py-1"
          />
        ) : (
          <>
            <input
              type="number"
              value={commonCharges}
              onChange={(e) => setCommonCharges(e.target.value)}
              placeholder="Common charges ($)"
              className="w-full rounded border px-2 py-1"
            />
            <input
              type="number"
              value={realEstateTax}
              onChange={(e) => setRealEstateTax(e.target.value)}
              placeholder="Real estate tax ($)"
              className="w-full rounded border px-2 py-1"
            />
          </>
        )}
        <button
          type="button"
          onClick={computeMonthlyCost}
          className="rounded bg-emerald-600 px-4 py-2 text-white"
        >
          Calculate Monthly Cost
        </button>
        {resultMonthlyCost && (
          <div className="text-green-700">
            Total monthly payment: ${resultMonthlyCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerBudgetTool;
