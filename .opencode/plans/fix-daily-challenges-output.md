# Fix AI-Generated Daily Challenges Output Checking

## Problem
AI-generated daily challenges fail validation even when child submits correct code. The AI generates `solutionCode` that defines functions but never calls them, so no output is produced. The `checkOutput` function looks for keywords in empty output and fails.

## Root Cause
The AI prompt in `apps/web/src/app/api/daily-challenges/route.ts` tells the AI to generate `solutionCode` that matches `expectedOutput`, but doesn't explicitly require test code that calls functions and prints results.

## Solution
Add explicit instruction to the AI prompt requiring function-based challenges to include test code that:
1. Calls the function with sample input
2. Prints the result using `print()`

## File to Edit
`apps/web/src/app/api/daily-challenges/route.ts`

## Change
Add clarification to rule 3 in the "IMPORTANT RULES" section (lines 133-142):

```
3. solutionCode output MUST match expectedOutput when run
   - If solutionCode defines a function, it MUST also include test code that:
     a) Calls the function with sample input
     b) Prints the result using print()
   - The output of running solutionCode must exactly match expectedOutput
```

## Impact
- Fixes "Not quite" error for function-based challenges
- Existing challenges in DB won't be affected until regenerated
- New challenges will work correctly

## Verification
- Check that new AI-generated challenges include print() calls in solutionCode
- Verify that output matches expectedOutput when solutionCode is run
- Test with a function-based challenge to ensure it passes validation
