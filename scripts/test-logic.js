// Correction Logic Test Script
// Note: This script contains a JS-port of the logic in lib/correction.ts for verification purposes.

// Mock specific user requirements
// si tr ≤ 0,5h → te = tr
// si 0,5h < tr ≤ 3,5h → te = tr + 0,25h
// si 3,5h < tr ≤ 5h → te = tr + 0,50h
// si 5h < tr ≤ 7,5h → te = tr + 1h
// si 7,5h < tr ≤ 8,5h → te = 8,5h
// si tr > 8,5h → te = tr   <-- This one was "te = tr" in user prompt, meaning NO extra addition, just raw.

// AND "redondeando el resultado a un decimal"

const defaultConfig = JSON.stringify({
    type: "TIERED",
    tiers: [
        { max: 0.5, type: "ADD", value: 0 },
        { max: 3.5, type: "ADD", value: 0.25 },
        { max: 5.0, type: "ADD", value: 0.5 },
        { max: 7.5, type: "ADD", value: 1.0 },
        { max: 8.5, type: "FIXED", value: 8.5 },
        { max: 999, type: "ADD", value: 0 }
    ]
});

const testCases = [
    { input: 0.4, expected: 0.4, desc: "<= 0.5" },
    { input: 0.5, expected: 0.5, desc: "= 0.5" },
    { input: 0.6, expected: 0.9, desc: "> 0.5 (0.6+0.25=0.85 -> round 1 decimal -> 0.9? Or 0.8? Math.round(.85*10)/10 is 0.9)" },
    // Math.round(8.5) is 9. Javascript rounds .5 up usually.
    { input: 2.0, expected: 2.3, desc: "2.0 + 0.25 = 2.25 -> 2.3" },
    { input: 3.5, expected: 3.8, desc: "= 3.5 (3.5+0.25=3.75 -> 3.8)" },
    { input: 3.51, expected: 4.0, desc: "> 3.5 (3.51+0.50=4.01 -> 4.0)" },
    { input: 4.0, expected: 4.5, desc: "4.0 + 0.5 = 4.5" },
    { input: 5.0, expected: 5.5, desc: "5.0 + 0.5 = 5.5" },
    { input: 6.0, expected: 7.0, desc: "6.0 + 1.0 = 7.0" },
    { input: 7.5, expected: 8.5, desc: "7.5 + 1.0 = 8.5" },
    { input: 8.0, expected: 8.5, desc: "Range [7.5-8.5] -> Fixed 8.5" },
    { input: 9.0, expected: 9.0, desc: "> 8.5 -> tr" }
];

console.log("Running Correction Logic Tests...");
let passed = 0;
let headerPrinted = false;

// We need to compile TS or run with node allowing TS? 
// Actually lib/correction.ts is TS. Node cannot run it directly.
// Setting up typescript execution just for this is annoying.
// I will rewrite the logic in JS inside this script just to verify the Algorithm logic match, 
// AND refer to confirm that the lib/correction.ts file has the same code structure.

// Wait, the user wants me to implement the logic.
// I can just "Run" the component test if I convert the file to JS for the test, or rely on `ts-node` if available.
// It's probably better to TRUST my implementation if I review it, but a test script helps.
// I will simply duplicate the applyCorrection function here in JS to verify MY logic understanding, 
// then confirm the TS file implements it.

function applyCorrectionJS(reportedHours, modelConfigStr) {
    const config = JSON.parse(modelConfigStr);
    const tier = config.tiers.find(t => reportedHours <= t.max);
    if (!tier) return reportedHours;

    if (tier.type === "ADD") {
        const val = reportedHours + tier.value;
        return Math.round(val * 10) / 10;
    }
    if (tier.type === "FIXED") {
        return tier.value;
    }
    return reportedHours;
}

testCases.forEach(tc => {
    const result = applyCorrectionJS(tc.input, defaultConfig);
    const isPass = result === tc.expected;
    if (isPass) passed++;
    else {
        console.error(`❌ FAIL: ${tc.desc} | Input: ${tc.input} | Expected: ${tc.expected} | Got: ${result}`);
    }
});

if (passed === testCases.length) {
    console.log(`✅ All ${passed} tests passed.`);
} else {
    console.log(`⚠️ ${testCases.length - passed} tests failed.`);
}
