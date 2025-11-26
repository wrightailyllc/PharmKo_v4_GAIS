const path = require("path");
const express = require("express");
const { analyzeDrugSafety } = require("./backend/geminiService");

const app = express();
app.use(express.json());

const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

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

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
