# Portfolio ROI Methodology: Time-Weighted Return (TWR)

This document explains the Time-Weighted Return (TWR) methodology used in your Finance Tracker to calculate portfolio performance.

## Why TWR?

Traditional "Simple ROI" ($Profit / Investment$) works well for a static investment, but fails for active portfolios. 

### The Problems with Simple ROI:
1.  **The Sale Effect**: If you sell a winning stock, your "Investment" denominator drops, making your ROI jump to 100% or 1000% artificially.
2.  **Cash Flow Distortion**: If you deposit £100k today, your ROI would suddenly drop because the denominator increased, even if the market didn't move.

**TWR** solves this by breaking the timeline into monthly periods and isolating the "Market Return" from your "Cash Flows".

---

## The Calculation Process

### 1. Monthly Returns
For each month, we calculate a **Growth Factor**.
$$Return_i = \frac{V_{end} - CashFlow_{net}}{V_{start}} - 1$$

*   **$V_{start}$**: Net worth at the beginning of the month.
*   **$V_{end}$**: Net worth at the end of the month.
*   **$CashFlow_{net}$**: Sum of all deposits and withdrawals during that month.

### 2. Cumulative ROI
We then "chain" these monthly returns together to get the total performance since day one.
$$Cumulative\_ROI = [(1 + r_1) \times (1 + r_2) \times \dots \times (1 + r_n)] - 1$$

---

## Example Walkthrough

Let's look at a hypothetical 3-month scenario:

| Month | Start Value | Net Cash Flow | End Value | Market Profit | Period Return |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Jan** | R$ 0 | R$ 10,000 | R$ 10,500 | + R$ 500 | **5.0%** |
| **Feb** | R$ 10,500 | R$ 5,000 | R$ 14,000 | - R$ 1,500 | **-9.7%** |
| **Mar** | R$ 14,000 | - R$ 2,000 | R$ 13,000 | + R$ 1,000 | **8.3%** |

### Step-by-Step Chain:
1.  **End of Jan**: $1.05$ (Up 5.0%)
2.  **End of Feb**: $1.05 \times (1 - 0.097) = 0.948$ (Down 5.2% cumulative)
3.  **End of Mar**: $0.948 \times (1 + 0.083) = 1.027$ (**Up 2.7% cumulative**)

**Result**: Even though you deposited R$ 13,000 total and ended with R$ 13,000 (0% net gain), your TWR correctly shows **+2.7%** because your first R$ 10k worked harder than your later deposits.

---

## Implementation Accuracy
To ensure the most accurate ROI, the Finance Tracker:
- Uses historical **Ledger.csv** data for cash flows before 2026.
- Uses **Live Database Transactions** for everything added recently.
- Combines them with **Monthly Snapshots** to ensure the ROI line is perfectly continuous.
