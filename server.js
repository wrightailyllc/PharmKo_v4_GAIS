// server.js (ES module)

import path from "path";
import express from "express";
import { fileURLToPath } from "url";
import { analyzeDrugSafety } from "./backend/geminiService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Serve static Vite build
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
