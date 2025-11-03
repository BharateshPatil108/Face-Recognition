const express = require('express');
const multer = require('multer');
const faceapi = require('face-api.js');
const canvas = require('canvas');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const port = 3001;

// Configure multer for image uploads
const upload = multer({ dest: 'uploads/' });

// Middleware to parse JSON
app.use(express.json({ limit: '50mb' })); // Increase limit for large Base64 images
const cors = require('cors');

app.use(cors({ 
  origin: 'http://localhost:3000', // Allow requests from your frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
  allowedHeaders: ['Content-Type'] // Allowed headers
}));
// Monkey-patch canvas for face-api.js
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Load face-api.js models
const loadModels = async () => {
  try {
    const modelPath = path.join(__dirname, 'models');
    console.log(`Loading models from: ${modelPath}`);

    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
    console.log('ssdMobilenetv1 model loaded');

    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    console.log('faceLandmark68Net model loaded');

    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
    console.log('faceRecognitionNet model loaded');

    console.log('All face models loaded successfully');
  } catch (error) {
    console.error('Error loading models:', error);
    process.exit(1);
  }
};
loadModels();

let storedEmbedding = null;

// Convert Base64 to image buffer
const base64ToBuffer = (base64String) => {
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
};

// Extract face embeddings from a Base64 image
const getEmbeddingImageBase64 = async (base64Image) => {
  try {
    const buffer = base64ToBuffer(base64Image);
    const tempFilePath = path.join(__dirname, 'temp_image.jpg');

    fs.writeFileSync(tempFilePath, buffer);
    const img = await canvas.loadImage(tempFilePath);
    const detection = await faceapi.detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    fs.unlinkSync(tempFilePath); // Clean up temp file

    if (!detection) {
      console.warn('No face detected');
      return null;
    }
    return detection.descriptor;
  } catch (error) {
    console.error('Error extracting embeddings:', error);
    return null;
  }
};


// Extract face embeddings from an image
const getEmbeddings = async (imagePath) => {
  try {
    const img = await canvas.loadImage(imagePath);
    const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
    if (!detection) {
      console.warn('No face detected');
      return null;
    }
    return detection.descriptor;
  } catch (error) {
    console.error('Error extracting embeddings:', error);
    return null;
  }
};

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const R = 6371e3; // Earth's radius in meters
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const deltaLatRad = toRadians(lat2 - lat1);
  const deltaLonRad = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};
const checkLocation = async (receivedLat, receivedLon) => {
  const [storedLocations] = await db.query("SELECT location_lat, location_long FROM tbl_location_master");

  for (let location of storedLocations) {
    const storedLat = location.location_lat;
    const storedLon = location.location_long;
    
    if (!storedLat || !storedLon) continue; 

    const distance = haversineDistance(storedLat, storedLon, receivedLat, receivedLon);
    if (distance <= 15) {
      return true; 
    }
  }

  return false; 
};
// Calculate Cosine similarity between two embeddings
const cosineSimilarity = (a, b) => {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  const similarity = dotProduct / (magnitudeA * magnitudeB);
  return similarity;
};

// Store face embedding endpoint
app.post('/api/store-face', upload.single('image'), async (req, res) => {
  console.log('📤 /api/store-face endpoint hit');

  if (!req.file) {
    return res.status(400).json({ message: 'No image provided' });
  }

  try {
    const embedding = await getEmbeddings(req.file.path);
    fs.unlinkSync(req.file.path); // Clean up

    if (!embedding) {
      return res.status(400).json({ message: 'No face detected' });
    }

    storedEmbedding = embedding;
    res.status(200).json({ message: '✅ Face embedding stored successfully' });
  } catch (error) {
 
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Compare face endpoint
app.post('/api/compare-face', upload.single('image'), async (req, res) => {
  console.log('📤 /api/compare-face endpoint hit');

  if (!req.file) {
   
    return res.status(400).json({ message: 'No image provided' });
  }

  if (!storedEmbedding) {

    return res.status(400).json({ message: 'No stored face to compare' });
  }

  try {
    const newEmbedding = await getEmbeddings(req.file.path);
    fs.unlinkSync(req.file.path); // Clean up

    if (!newEmbedding) {

      return res.status(400).json({ message: 'No face detected' });
    }

    const similarity = cosineSimilarity(storedEmbedding, newEmbedding);
    const isMatch = similarity > 0.8; 



    res.status(200).json({
      message: isMatch ? '✅ Face Match!' : '❌ Face Not Match!',
      similarity: similarity.toFixed(4),
    });
  } catch (error) {

    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post('/api/save', async (req, res) => {
  console.log('📤 /api/save endpoint hit');
  const { userId, base64Image } = req.body;
  if (!userId || !base64Image) {
    return res.status(404).json({ message: 'User ID and Face is required' });
  }
  try {
    const embedding = await getEmbeddingImageBase64(base64Image);
    if (!embedding) {
      return res.status(404).json({ message: 'No face detected' });
    }
    const embeddingArray = Object.values(embedding); 
    const embeddingJSON = JSON.stringify(embeddingArray); 
    const currentDateTime = new Date();
    const sql = `
      INSERT INTO tbl_face_embeddings 
      (user_id, embedding_json, created_on, update_on, updated_by, created_by, is_active) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const values = [userId, embeddingJSON, currentDateTime, currentDateTime, 0, 0, 1];
    const dbQuery = new Promise(async (resolve, reject) => {
      try {
        const [result] = await db.query(sql, values);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Database query timeout - Slow internet or server overload")), 5000);
    });
    const result = await Promise.race([dbQuery, timeout]);
    return res.status(200).json({ message: "Face Registered successfully." });
  } catch (error) {
    if (error.message.includes("ECONNREFUSED")) {
      return res.status(501).json({ message: "Database connection failed - Check internet or database server" });
    } else if (error.message.includes("Database query timeout")) {
      return res.status(502).json({ message: "Database query timeout - Slow internet or server issue" });
    }
    return res.status(500).json({ message: "Error storing face." });
  }
});

app.post('/api/verify', async (req, res) => {
  console.log('📤 /api/verify endpoint hit');
   const  {base64Image} = req.body;  //latitude,longitude
  if (!base64Image) {
    return res.status(404).json({ message: 'No image provided' });
  }
  try {
    // const isWithinRange = await checkLocation(latitude, longitude);
    // console.log("isWithinRange",isWithinRange)
    // if (!isWithinRange) {
    //   return res.status(202).json({ message: 'You are outside the allowed location range' });
    // }
    const newEmbedding = await getEmbeddingImageBase64(base64Image);
    if (!newEmbedding) {
      return res.status(404).json({ message: 'No face detected' });
    }
    const [storedEmbeddings] = await db.query('SELECT id,embedding_json,user_id FROM tbl_face_embeddings');
    if (storedEmbeddings.length === 0) {
      return res.status(404).json({ message: 'No face registered in the system' });
    }
    let faceMatched = false;
    let matchedId = null;
    let faceEmbeddingId=null;
    for (let row of storedEmbeddings) {
      if (!row.embedding_json) {
        console.error(`Skipping invalid embedding for ID: ${row.id}`);
        continue; 
      }
      let storedEmbedding;
      try {
        storedEmbedding = JSON.parse(row.embedding_json);
      } catch (parseError) {
        console.error('Error parsing stored embedding:', parseError, 'Row:', row);
        continue; 
      }
      const similarity = cosineSimilarity(storedEmbedding, newEmbedding);
      if (similarity > 0.95) {
        faceMatched = true
        // matchedId = row.user_id;
        // faceEmbeddingId=row.id;
        // // Insert into tbl_face_attendance
        // const now = new Date();
        // const formattedDate = now.toISOString().split('T')[0]; 
        // const formattedTime = now.toTimeString().split(' ')[0];
        // await db.query(
        //   `INSERT INTO tbl_face_attendance (user_id,face_embedding_id, created_on,update_on,updated_by,created_by,is_active,
        //    attendace_date, attendance_time) 
        //    VALUES (?, ?, ?, ?, ?,?,?,?,?)`,
        //   [matchedId,faceEmbeddingId, now,null,0,0,1, formattedDate, formattedTime]
        // );
        return res.status(200).json({
          message: 'Face Matched', //Attendance Marked
          similarity: similarity.toFixed(4),
          matchedId: row.user_id,
        });
      }
    }
    if (!faceMatched) {
      return res.status(404).json({ message: 'face not Registered' });
  }
  } catch (error) {
    if (error.message.includes("ECONNREFUSED")) {
      return res.status(501).json({ message: "Database connection failed - Check internet or database server" });
    } else if (error.message.includes("Database query timeout")) {
      return res.status(502).json({ message: "Database query timeout - Slow internet or server issue" });
    }
    res.status(500).json({ message: 'Error comparing face' });
  }
});

// Start server
app.listen(port, () => console.log(` Server running on http://localhost:${port}`));

db.query('SELECT 1')
  .then(() => console.log(' MySQL Connected Successfully'))
  .catch(err => console.error(' MySQL Connection Error:', err));
