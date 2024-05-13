const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

// altchoice11
// eDed63MbFMjZ8kaB

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
    await client.connect();

    const queryCollection = client.db("AltChoiceDB").collection("query");
    const recommendationCollection = client
      .db("AltChoiceDB")
      .collection("recommendation");

    //get all query data
    app.get("/query", async (req, res) => {
      const result = await queryCollection.find().toArray();
      res.send(result);
    });

    //get my query by email
    app.get("/my-query/:email", async (req, res) => {
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
      const query = {queryId: id};
      const result = await recommendationCollection.find(query).toArray();
      res.send(result);
    })

    //get recommendations by email
    app.get("/recommendations/user-email/:email", async (req, res) => {
      const email = req.params.email;
      const query = {recommenderEmail: email};
      const result = await recommendationCollection.find(query).toArray();
      res.send(result);
    })

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
    await client.db("admin").command({ ping: 1 });
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
