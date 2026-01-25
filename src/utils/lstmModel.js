import * as tf from '@tensorflow/tfjs';

// Configuration
const WINDOW_SIZE = 5; // Look back at 5 draws
// NUM_FEATURES will now be dynamic
const TRAIN_LIMIT = 300; // Only use top 300 records
const EPOCHS = 50; // Fixed epochs for time management (~30s)

/**
 * Converts a draw object to a multi-hot tensor vector.
 * Indices 0 to MAX-1 correspond to numbers 1 to MAX.
 * @param {Object} draw The draw object
 * @param {boolean} isTarget Whether this is a target (y) or input (X)
 * @param {number} maxNum Maximum number in the pool (e.g. 49)
 * @param {number} pickCount Number of picks (e.g. 6)
 * @returns {Array} Array of length maxNum
 */
const drawToVector = (draw, isTarget = false, maxNum = 49, pickCount = 6) => {
    const vector = Array(maxNum).fill(0);

    // Standard numbers (first N)
    draw.numbers.slice(0, pickCount).forEach(num => {
        if (num >= 1 && num <= maxNum) {
            vector[num - 1] = 1.0;
        }
    });

    // Special number (Next index) if it exists and is within range
    // NOTE: For Super Lotto, Special is separate, so maybe we shouldn't mix it into the main vector?
    // However, for LSTM trend prediction, knowing the special number might still be useful context?
    // Given the current architecture only predicts MAIN numbers, we should probably stick to MAIN numbers 
    // for the vector to avoid confusion, OR include it but ensure we only decode MAIN numbers later.
    // For simplicity and consistency with other engines, let's Stick to MAIN numbers for now if it's separate.
    // actually, let's include it with reduced weight if it's NOT separate (Lotto 6/49).

    // logic: If we are just predicting main numbers, maybe we ignore special number for now to keep it clean.
    // But existing logic had it. Let's keep it safe:
    if (draw.numbers[pickCount]) {
        const sp = draw.numbers[pickCount];
        // Only include if it maps to the same feature space (1-49)
        if (sp >= 1 && sp <= maxNum) {
            // For Super Lotto (1-38), if sp is 1-8, it overlaps with Main 1-8. 
            // This collision is BAD for a multi-hot vector if we don't distinguish zones.
            // So, if it's separate zone, we should IGNORE it in this single-vector model.
            // The previous logic mixed it in. 
            // We can assume if pickCount is passed, we check if we should include special.
            // For now, let's strictly stick to logic: Include only if it falls in range.
            // And if it's a separate zone game (implied by context or passed config), we might want to exclude.
            // Since we don't have isSeparate here easily without passing full config, let's just default to:
            // If sp is in range, add it (compat with 6/49). 
            // BUT for Super Lotto (Max 38), sp (1-8) would boost signal for 1-8. 
            // Maybe better to only include if index < pickCount? 
            // Let's stick to: ONLY MAIN NUMBERS for vector input to be safe for Multi-Game.
        }
    }
    return vector;
};

export const trainAndPredict = async (fullHistory, statusCallback, useWeights = true, gameConfig) => {
    if (!fullHistory || fullHistory.length < WINDOW_SIZE + 10) {
        throw new Error("Not enough data to train LSTM");
    }

    // Dynamic Config
    const NUM_FEATURES = gameConfig?.maxNumber || 49;
    const PICK = gameConfig?.pickCount || 6;

    statusCallback({ message: "Preprocessing data...", progress: 5 });

    // 1. Prepare Data: Take top N (up to TRAIN_LIMIT) and Reverse to Chronological (Old -> New)
    const limit = Math.min(fullHistory.length, TRAIN_LIMIT);
    const dataSlice = fullHistory.slice(0, limit).reverse();
    const len = dataSlice.length;

    // Adaptive Thresholds based on selected range size
    const tier1Limit = Math.max(5, Math.min(20, Math.floor(len * 0.2)));
    const tier2Limit = Math.max(10, Math.min(50, Math.floor(len * 0.5)));

    const X_data = [];
    const y_data = [];

    // Create sequences
    for (let i = WINDOW_SIZE; i < len; i++) {
        // Input: Window of previous draws
        const windowDraws = dataSlice.slice(i - WINDOW_SIZE, i);
        const featureSequence = windowDraws.map(d => drawToVector(d, false, NUM_FEATURES, PICK));

        // Target: Current draw
        const targetDraw = dataSlice[i];
        const targetVector = drawToVector(targetDraw, true, NUM_FEATURES, PICK);

        const distFromEnd = dataSlice.length - 1 - i;

        // Base sample
        X_data.push(featureSequence);
        y_data.push(targetVector);

        // Apply Tiered Weighting
        if (useWeights) {
            if (distFromEnd < tier1Limit) {
                // Tier 1: 3x
                X_data.push(featureSequence);
                y_data.push(targetVector);
                X_data.push(featureSequence);
                y_data.push(targetVector);
            }
            else if (distFromEnd < tier2Limit) {
                // Tier 2: 2x
                X_data.push(featureSequence);
                y_data.push(targetVector);
            }
        }
    }

    // Convert to Tensors
    const xs = tf.tensor3d(X_data); // [samples, window, features]
    const ys = tf.tensor2d(y_data); // [samples, features]

    // 2. Build Model
    statusCallback({ message: "Building Neural Network...", progress: 10 });
    const model = tf.sequential();

    // LSTM Layer
    model.add(tf.layers.lstm({
        units: 64,
        inputShape: [WINDOW_SIZE, NUM_FEATURES],
        returnSequences: false
    }));

    // Dropout
    model.add(tf.layers.dropout({ rate: 0.2 }));

    // Output Layer
    model.add(tf.layers.dense({
        units: NUM_FEATURES,
        activation: 'sigmoid'
    }));

    model.compile({
        optimizer: 'adam',
        loss: 'binaryCrossentropy'
    });

    // 3. Train
    await model.fit(xs, ys, {
        epochs: EPOCHS,
        batchSize: 16,
        shuffle: true,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                const progress = 15 + Math.round((epoch / EPOCHS) * 75);
                if (epoch % 5 === 0) {
                    statusCallback({
                        message: `Training: Epoch ${epoch}/${EPOCHS} - Loss: ${logs.loss.toFixed(4)}`,
                        progress
                    });
                }
            }
        }
    });

    // 4. Predict Next Draw
    statusCallback({ message: "Generating Prediction...", progress: 95 });

    const lastWindow = fullHistory.slice(0, WINDOW_SIZE).reverse();
    const inputSeq = lastWindow.map(d => drawToVector(d, false, NUM_FEATURES, PICK));

    const inputTensor = tf.tensor3d([inputSeq]);
    const predictionTensor = model.predict(inputTensor);
    const predictionScores = await predictionTensor.data();

    // Cleanup
    xs.dispose();
    ys.dispose();
    inputTensor.dispose();
    predictionTensor.dispose();

    // 5. Process Output
    const scoredNumbers = Array.from(predictionScores).map((score, i) => ({
        num: i + 1,
        score: score
    }));

    scoredNumbers.sort((a, b) => b.score - a.score);

    const topN = scoredNumbers.slice(0, PICK).map(s => s.num).sort((a, b) => a - b);

    statusCallback({ message: "Done!", progress: 100 });
    return topN;
};
