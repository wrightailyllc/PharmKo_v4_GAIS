// server.js
const path = require("path");
const express = require("express");
const { analyzeDrugSafety } = require("./backend/geminiService"); // you'll create this next

const app = express();
app.use(express.json());

// Serve the built frontend
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

// API endpoint that the frontend will call
app.post("/api/analyze", async (req, res) => {
  const { drugName } = req.body;

  if (!drugName || typeof drugName !== "string") {
    return res.status(400).json({ error: "Missing 'drugName' string" });
  }

  const logs = [];
  const updateLog = (msg) => {
    logs.push(msg);
    console.log("[LOG]", msg);
  };

  try {
    const { analysisResult, sourceData } = await analyzeDrugSafety(
      drugName,
      updateLog
    );

    res.json({ analysisResult, sourceData, logs });
  } catch (err) {
    console.error("Error in /api/analyze:", err);
    res.status(500).json({
      error: err?.message ?? String(err),
      logs,
    });
  }
});

// Cloud Run requirement: listen on PORT env
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
