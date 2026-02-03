# Transform Data — Known Issues & Edge Cases

This document lists common issues that can occur while using Transform Data operations, why they happen, and what to do.

## Lookups (VLOOKUP/HLOOKUP/XLOOKUP)

### Keys don’t match even when they look the same

#### Cause

- Hidden spaces, different casing, mixed number/text formats (e.g., `00123` vs `123`).

#### Mitigation

- Clean/standardize the key columns (trim spaces; ensure consistent formatting).

### Duplicate keys in the lookup sheet

#### Behavior

- The current implementation uses the **first match** found in the lookup sheet.

#### Recommendation (Duplicate keys)

- Ensure lookup keys are unique.

### Missing keys

#### Behavior (Missing keys)

- When no match is found, the returned value is blank.

---

## Join Sheets

### Brought-over column already exists in active sheet

#### Behavior (Join)

- Operation stops and warns about name collisions.

#### Recommendation (Join)

- Rename existing column(s) or pick different columns to bring.

---

## Mathematics operations

### Non-numeric values

#### Behavior (Non-numeric)

- Any blank/non-numeric cells may cause blank/0/NaN-like behavior depending on the operation.

#### Recommendation (Non-numeric)

- Clean data first or create a conditional column that normalizes blanks.

### Division by zero

#### Behavior (Division by zero)

- Division may produce empty or non-finite values.

#### Recommendation (Division by zero)

- Use Conditional IF/THEN/ELSE to guard against zero denominators.

---

## SUMIFS / COUNTIFS

### Large sheets can be slow in browser

#### Cause (Performance)

- Grouping operations are O(n) and can be heavy with tens of thousands of rows.

#### Recommendation (Performance)

- For large workbooks, implement backend fallback execution (planned).  

---

## Conditional (IF/THEN/ELSE)

### Comparing numbers as text

#### Cause (Type comparisons)

- If your column contains mixed numeric/text values, comparisons may behave like string comparisons.

#### Recommendation (Type normalization)

- Normalize the column type (e.g., clean values) or use Equals/Contains instead of numeric comparisons.
