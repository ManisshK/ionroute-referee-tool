const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

function scaleValue(text) {
    if (!text) return 5;
    const t = text.toLowerCase();
    if (t.includes("ultra low")) return 10;
    if (t.includes("very low")) return 9;
    if (t.includes("low")) return 8;
    if (t.includes("medium")) return 5;
    if (t.includes("high")) return 3;
    return 5;
}

function buildRoute(name, latency, cost, scalability, difficulty, coldStart, bestFor, summary, pros, cons, weight) {
    return {
        name,
        latency,
        cost,
        scalability,
        difficulty,
        coldStart,
        bestFor,
        summary,
        pros,
        cons,
        score: weight,
        radar: {
            latency: scaleValue(latency),
            cost: scaleValue(cost),
            scalability: scaleValue(scalability),
            difficulty: scaleValue(difficulty),
            coldStart: scaleValue(coldStart)
        }
    };
}

app.post("/analyze-inference", (req, res) => {
    const u = req.body;

    const size = Number(u.modelSize || 0);
    const lat = Number(u.latency || 0);
    const gpu = u.gpuFlag === "Yes";
    const traffic = u.trafficFlow;
    const budget = u.costPreference;
    const cold = u.bootTolerance;

    let list = [];

    const lambdaScore =
        (budget === "Low" ? 3 : 0) +
        (size < 150 ? 2 : 0) +
        (cold === "High" ? 1 : 0);

    list.push(
        buildRoute(
            "Lambda + S3",
            "Medium",
            "Low",
            "High",
            "Easy",
            "High",
            "Small models, low traffic, minimal cost",
            "Cheap and simple, but cold starts hurt performance.",
            [
                "Very low cost",
                "Simple to maintain",
                "Scales automatically"
            ],
            [
                "Cold starts increase latency",
                "No GPU support",
                "Bad for large models"
            ],
            lambdaScore
        )
    );

    const serverlessScore =
        (traffic === "Spiky" ? 3 : 0) +
        (budget === "Medium" ? 1 : 0) +
        (cold === "Medium" ? 1 : 0);

    list.push(
        buildRoute(
            "SageMaker Serverless",
            "Medium",
            "Medium",
            "High",
            "Medium",
            "Medium",
            "Spiky or unpredictable workloads",
            "Flexible and cost-efficient for variable traffic.",
            [
                "Auto-scaling",
                "Pay-per-use",
                "Supports medium-sized models"
            ],
            [
                "Cold starts happen under load",
                "Not ideal for ultra-low latency apps"
            ],
            serverlessScore
        )
    );

    const realtimeScore =
        (lat < 200 ? 3 : 0) +
        (cold === "Low" ? 3 : 0) +
        (traffic === "Steady" ? 2 : 0);

    list.push(
        buildRoute(
            "SageMaker Real-Time Endpoint",
            "Low",
            "High",
            "Very High",
            "Medium",
            "None",
            "Strict latency, always-on workloads",
            "Fastest stable inference with no cold starts.",
            [
                "Zero cold starts",
                "Highly scalable",
                "Consistent low latency"
            ],
            [
                "High cost",
                "Needs endpoint always running"
            ],
            realtimeScore
        )
    );

    const fargateScore =
        (gpu ? 4 : 0) +
        (size > 350 ? 3 : 0) +
        (traffic === "Burst" ? 2 : 0);

    list.push(
        buildRoute(
            "ECS/Fargate GPU",
            "Very Low",
            "High",
            "High",
            "Hard",
            "Low",
            "Heavy GPU workloads, large models",
            "Powerful containerized GPU inference.",
            [
                "Full GPU acceleration",
                "Consistent performance",
                "Great for large parallel workloads"
            ],
            [
                "High cost",
                "Complexity in setup",
                "Overkill for small models"
            ],
            fargateScore
        )
    );

    const greenScore =
        (traffic === "Offline" ? 5 : 0) +
        (lat < 100 ? 2 : 0);

    list.push(
        buildRoute(
            "AWS Greengrass (Edge Execution)",
            "Ultra Low",
            "Low",
            "Edge-only",
            "Medium",
            "None",
            "Offline or local inference",
            "Ultra-low latency on edge devices.",
            [
                "Zero cloud dependency",
                "Instant inference",
                "Very low cost"
            ],
            [
                "Requires edge hardware",
                "Not cloud scalable"
            ],
            greenScore
        )
    );

    const sorted = list.sort((a, b) => b.score - a.score);
    const best = sorted[0];

    res.json({
        recommended: best.name,
        reason: `Based on your constraints, "${best.name}" aligns the closest with your performance, scaling, and cost needs.`,
        comparisons: sorted
    });
});

app.listen(3000, () => {
    console.log("Full system ready at http://localhost:3000");
});
