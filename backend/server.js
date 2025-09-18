import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import FormData from "form-data";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer();

// Enable CORS for React Native
app.use(cors());
app.use(express.json());

app.post("/transcribe", upload.single("file"), async (req, res) => {
  try {
    console.log("Received file:", req.file?.originalname, "Size:", req.file?.size);
    
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const fileBuffer = req.file.buffer;

    const formData = new FormData();
    formData.append("file", fileBuffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    formData.append("model", "whisper-1");
    formData.append("response_format", "json");

    console.log("Forwarding to OpenAI...");
    
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    console.log("Transcription successful:", data.text);
    
    res.json(data);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Failed to transcribe audio" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Make sure OPENAI_API_KEY is set in your .env file");
});
