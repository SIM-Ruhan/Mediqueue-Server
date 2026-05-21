const express = require('express')
const dotenv = require("dotenv")
const cors = require("cors")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
dotenv.config();
const uri = process.env.URI;
const app = express()
const port = process.env.PORT;
 app.use(cors())

app.use(express.json())
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
serverApi: {
version: ServerApiVersion.v1,
strict: true,
deprecationErrors: true,
  }
});
const JWKS =createRemoteJWKSet(
new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
)
const verifyToken = async (req, res, next) => {
  console.log("=== [verifyToken] Middleware Started ===");
  
  const authHeader = req?.headers.authorization;
  console.log("[verifyToken] Auth Header:", authHeader ? "Received" : "Not Found");

  if (!authHeader) {
    console.error("[verifyToken] Error: Authorization header is missing. Returning 401.");
    return res.status(401).json({
      message: "Unauthorized"
    });
  }

  const token = authHeader.split(" ")[1];
  console.log("[verifyToken] Extracted Token:", token ? `Token starts with: ${token.substring(0, 10)}...` : "None");

  if (!token) {
    console.error("[verifyToken] Error: Token format is invalid or missing after 'Bearer'. Returning 401.");
    return res.status(401).json({
      message: "Unauthorized"
    });
  }

  try {
    console.log("[verifyToken] Attempting to verify token with JWKS...");
    const { payload } = await jwtVerify(token, JWKS);
    
    console.log("[verifyToken] Success: Token verified properly!");
    console.log("[verifyToken] Token Payload:", payload);
    
    console.log("=== [verifyToken] Passing to next() ===");
    next();
  } catch (error) {
    console.error("[verifyToken] Error: Token verification failed!", error.message);
    return res.status(403).json({
      message: "Forbidden"
    });
  }
};
async function run() {
try {
// Connect the client to the server (optional starting in v4.7)
// await client.connect();
// Send a ping to confirm a successful connection
// await client.db("admin").command({ ping: 1 });
console.log("Pinged your deployment. You successfully connected to MongoDB!");
const db = client.db("wanderlust")
const destinationCollection = db.collection("destinations")
const bookingCollection = db.collection("bookings")
// app.get("/destination",async (req,res) => {
// const result = await destinationCollection.find().toArray();
// res.json(result);
// })
app.get("/destination", async (req, res) => {
  try {
    const { search, startDate, endDate } = req.query;
    let query = {};

    if (search) {
      query.tutorName = { $regex: search, $options: "i" };
    }

    if (startDate || endDate) {
      query.sessionStartDate = {};

      if (startDate) {
        query.sessionStartDate.$gte = new Date(startDate).toISOString();
      }

      if (endDate) {
        query.sessionStartDate.$lte = new Date(endDate).toISOString();
      }
    }
    const result = await destinationCollection.find(query).toArray();
    res.json(result);

  } catch (error) {
    console.error("Error fetching tutors:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// end here
app.post("/destination", async (req,res)=> {
const destinationData = req.body;
const result = await destinationCollection.insertOne(destinationData)
res.json(result);
}) 
//midleware
app.get("/destination/:id",verifyToken, async (req,res)=>{
const {id} = req.params;
const result = await destinationCollection.findOne({_id: new ObjectId(id)})
res.json(result);
});
app.patch("/destination/:id",async(req,res)=>{
const {id} = req.params
const updateData = req.body
const result = await destinationCollection.updateOne(
    {_id:new ObjectId(id)},
      {$set: updateData}
)
res.json(result);
}
  )
app.post(`/booking`,verifyToken, async(req,res)=>{
const bookingData = req.body;
const result = await bookingCollection.insertOne(bookingData);
res.json(result);
})


app.get("/booking/:studentEmail", async (req, res) => {
const { studentEmail } = req.params;
const result = await bookingCollection.find({ studentEmail }).toArray();
res.json(result);
});


app.delete("/destination/:id", async(req,res)=> {
const {id} = req.params;
const result = await destinationCollection.deleteOne({_id: new ObjectId(id)})
res.json(result);
})
app.delete("/booking/:bookingId",verifyToken,async(req,res)=>{
const {bookingId} = req.params;
const result = await bookingCollection.deleteOne({_id: new ObjectId(bookingId)})
res.json(result)
})




  } finally {
// Ensures that the client will close when you finish/error
// await client.close();
  }
}
run().catch(console.dir);
app.get('/', (req, res) => {
res.send('Server is running smoothly')
})
app.listen(port, () => {
console.log(`Example app listening on port ${port}`)
})