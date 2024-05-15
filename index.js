const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;
const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://alt-choice.web.app",
      "https://alt-choice.firebaseapp.com",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());
app.use(cookieParser());

//verify jwt middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        console.log(err);
        return res.status(401).send({ message: "unauthorized access" });
      }
      console.log(decoded);
      req.user = decoded;
      next();
    });
  }
  console.log(token);
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j6yhdqz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();

    const queryCollection = client.db("AltChoiceDB").collection("query");
    const recommendationCollection = client
      .db("AltChoiceDB")
      .collection("recommendation");

    // jwt generate
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    //clear token on logout
    app.get("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          maxAge: 0,
        })
        .send({ success: true });
    });

    //get all query data
    app.get("/query", async (req, res) => {
      const result = await queryCollection.find().toArray();
      res.send(result);
    });

    //get my query by email
    app.get("/my-query/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { "queryUser.email": email };
      const result = await queryCollection.find(query).toArray();
      res.send(result);
    });

    //get single query by id
    app.get("/query/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await queryCollection.findOne(query);
      res.send(result);
    });

    //get all recommendations
    app.get("/recommendations", async (req, res) => {
      const result = await recommendationCollection.find().toArray();
      res.send(result);
    });

    //get recommendations by id
    app.get("/recommendations/:id", async (req, res) => {
      const id = req.params.id;
      const query = { queryId: id };
      const result = await recommendationCollection.find(query).toArray();
      res.send(result);
    });

    //get my recommendations by email
    app.get(
      "/recommendations/user-email/:email",
      verifyToken,
      async (req, res) => {
        const email = req.params.email;
        const tokenEmail = req.user.email;
        if (tokenEmail !== email) {
          return res.status(403).send({ message: "forbidden access" });
        }
        const query = { recommenderEmail: email };
        const result = await recommendationCollection.find(query).toArray();
        res.send(result);
      }
    );

    //get recommendations for me by email
    app.get(
      "/recommendations/query-user/:email",
      verifyToken,
      async (req, res) => {
        const email = req.params.email;
        const tokenEmail = req.user.email;
        if (tokenEmail !== email) {
          return res.status(403).send({ message: "forbidden access" });
        }
        const query = { userEmail: email };
        const result = await recommendationCollection.find(query).toArray();
        res.send(result);
      }
    );

    //post all query
    app.post("/query", async (req, res) => {
      const queryData = req.body;
      const result = await queryCollection.insertOne(queryData);
      res.send(result);
    });

    //post all recommendations
    app.post("/recommendations", async (req, res) => {
      const recommendedData = req.body;
      const result = await recommendationCollection.insertOne(recommendedData);
      res.send(result);
    });

    // increment recommendation count
    app.post("/increment/:id", async (req, res) => {
      const id = req.params.id;
      const result = await queryCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $inc: {
            recommendationCount: 1,
          },
        }
      );
      res.status(200).json(result);
    });

    //decrement recommendation count
    app.post("/decrement/:id", async (req, res) => {
      const id = req.params.id;
      const result = await queryCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $inc: {
            recommendationCount: -1,
          },
        }
      );
      res.send(result);
    });

    //update query
    app.put("/update-query/:id", async (req, res) => {
      const id = req.params.id;
      const queryData = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...queryData,
        },
      };
      const result = await queryCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    //delete query
    app.delete("/delete-query/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await queryCollection.deleteOne(query);
      res.send(result);
    });

    //delete recommendation
    app.delete("/delete-recommendation/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await recommendationCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Alternative choice is running");
});

app.listen(port, () => console.log(`Hello I am active now ${port}`));
