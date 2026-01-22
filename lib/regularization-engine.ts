/**
 * Regularization Calculation Engine
 * Supports multiple strategies: Standard, Rappel (Volume-based), and Consultant Level
 */

export type RappelTier = {
    minHours: number;
    maxHours: number | null; // null = infinity
    rate: number;
};

export type ConsultantLevelRate = {
    [level: string]: number; // e.g., { "Junior": 45, "Senior": 60 }
};

export type SpecialRegularizationConfig = RappelTier[] | ConsultantLevelRate;

/**
 * Calculate regularization amount based on strategy
 */
export function calculateRegularizationAmount(
    hoursToRegularize: number,
    standardRate: number | null,
    specialRegularization?: {
        type: string;
        config: string;
    }
): number {
    // If no special regularization, use standard rate
    if (!specialRegularization) {
        return hoursToRegularize * (standardRate || 0);
    }

    try {
        const config = JSON.parse(specialRegularization.config);

        if (specialRegularization.type === "RAPPEL") {
            return calculateRappelAmount(hoursToRegularize, config as RappelTier[]);
        } else if (specialRegularization.type === "CONSULTANT_LEVEL") {
            // For consultant level, we need worklog details
            // This is a simplified version - actual implementation would need worklog data
            return hoursToRegularize * (standardRate || 0);
        }
    } catch (error) {
        console.error("Error parsing special regularization config:", error);
    }

    // Fallback to standard rate
    return hoursToRegularize * (standardRate || 0);
}

/**
 * Calculate amount using volume-based rappel (tiered rates)
 */
function calculateRappelAmount(totalHours: number, tiers: RappelTier[]): number {
    // Sort tiers by minHours to ensure correct order
    const sortedTiers = [...tiers].sort((a, b) => a.minHours - b.minHours);

    // Find the applicable tier
    for (const tier of sortedTiers) {
        const isInRange = totalHours >= tier.minHours &&
            (tier.maxHours === null || totalHours <= tier.maxHours);

        if (isInRange) {
            return totalHours * tier.rate;
        }
    }

    // If no tier matches, use the highest tier rate
    const highestTier = sortedTiers[sortedTiers.length - 1];
    return totalHours * (highestTier?.rate || 0);
}

/**
 * Calculate amount based on consultant levels from worklogs
 */
export function calculateConsultantLevelAmount(
    worklogs: Array<{ author: string; hours: number; authorLevel?: string | null }>,
    levelRates: ConsultantLevelRate,
    defaultRate: number
): number {
    let totalAmount = 0;

    for (const log of worklogs) {
        const level = log.authorLevel || "Standard";
        const rate = levelRates[level] || defaultRate;
        totalAmount += log.hours * rate;
    }

    return totalAmount;
}

/**
 * Get the applicable rate for a given volume (for display purposes)
 */
export function getRappelRateForVolume(volume: number, tiers: RappelTier[]): number {
    const sortedTiers = [...tiers].sort((a, b) => a.minHours - b.minHours);

    for (const tier of sortedTiers) {
        const isInRange = volume >= tier.minHours &&
            (tier.maxHours === null || volume <= tier.maxHours);

        if (isInRange) {
            return tier.rate;
        }
    }

    const highestTier = sortedTiers[sortedTiers.length - 1];
    return highestTier?.rate || 0;
}
