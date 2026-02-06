/**
 * Extracted parameters from linear_regression_model.joblib
 */
const MODEL_PARAMS = {
    coef: [
        0.04580286497755781, -0.011584427506313083, 0.01661403037395369,
        0.03961451535563647, -0.037207508480158274, 0.013884377296592913,
        0.03579110776650467, -0.024399272308905685, -0.009818628453376832,
        0.03930261370839062, 0.05580468660604358, 0.02335354609210913,
        -0.15547531276564677, 0.943872100008633
    ],
    intercept: 1.1008575337049606
};

/**
 * Predicts the minimum temperature using the linear regression formula:
 * y = dot_product(X, coefficients) + intercept
 */
export const predictMinTemp = (temperatures: number[]): number => {
    if (temperatures.length !== 14) {
        throw new Error("Exactly 14 temperature values are required.");
    }

    // Calculate dot product: Sum of (temp_i * coef_i)
    const dotProduct = temperatures.reduce((sum, temp, i) => {
        return sum + (temp * MODEL_PARAMS.coef[i]);
    }, 0);

    // Return prediction
    return dotProduct + MODEL_PARAMS.intercept;
};
