
// Logic for applying correction factors based on models

export type TierConfig = {
    max: number; // Upper bound of the tier
    type: "ADD" | "FIXED" | "MULTIPLY";
    value: number; // Value to add, set, or multiply
}

export type CorrectionConfig = {
    type: "TIERED" | "RATE_DIFF" | "FIXED_FACTOR";
    tiers?: TierConfig[]; // For TIERED
    referenceRate?: number; // For RATE_DIFF
    factor?: number; // For FIXED_FACTOR
}

export function applyCorrection(
    reportedHours: number,
    modelConfig: CorrectionConfig | string,
    context?: { wpRate?: number }
): number {
    if (!modelConfig) return reportedHours;

    let config: CorrectionConfig;
    try {
        config = typeof modelConfig === 'string' ? JSON.parse(modelConfig) : modelConfig;
    } catch (e) {
        console.error("Invalid Correction Config JSON", e);
        return reportedHours;
    }

    // 1. TIERED (Redondeo escalonado)
    if (config.type === "TIERED" && config.tiers) {
        // Find the matching tier
        // Tiers should be ordered by max ascending usually, but we can search for the first one where reported <= max
        // If max is 999 or extremely high, it catches the rest.

        const tier = config.tiers.find(t => reportedHours <= t.max);

        if (!tier) return reportedHours; // Should not happen if last tier is catch-all

        if (tier.type === "ADD") {
            const rounded = reportedHours + tier.value;
            // "redondeando el resultado a un decimal" -> User requirement.
            return Math.round(rounded * 10) / 10;
        }

        if (tier.type === "FIXED") {
            return tier.value;
        }

        if (tier.type === "MULTIPLY") {
            return Math.round((reportedHours * tier.value) * 10) / 10;
        }
    }

    // 2. RATE DIFF
    if (config.type === "RATE_DIFF") {
        const refRate = config.referenceRate || 65.0;
        const currentRate = context?.wpRate || 0;

        if (currentRate === 0) return reportedHours;

        // Formula: te = tr * (wp.rate / 65)
        const factor = currentRate / refRate;
        const result = reportedHours * factor;

        return Math.round(result * 100) / 100; // 2 decimals usually for this calc
    }

    // 3. FIXED FACTOR (Legacy simple factor)
    if (config.type === "FIXED_FACTOR") {
        const factor = config.factor || 1.0;
        return reportedHours * factor;
    }

    return reportedHours;
}
