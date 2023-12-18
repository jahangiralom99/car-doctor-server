const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const app = express();
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 3000;

// middleware
app.use(cors({
  origin: [
    "https://car-doctor-8b3a8.web.app",
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.e9wqxpd.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// my middleware 
const logger = async(req, res, next) => {
  console.log('called : ', req.host, req.originalUrl);
  next();
}

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  // console.log(token);
  if (!token) {
    return res.status(401).send({message: "not authorized"})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    // err hole
    if (err) {
      return res.status(401).send({message: "Unauthorized"})
    }
    // decode hole
    console.log("value in the token", decoded);
    req.user = decoded;
    next();
  })

}




async function run() {
  try {
    await client.connect();
    // Send a ping to confirm a successful connection

    const servicesCollection = client.db("carDoctor").collection("services");
    const orderCollection = client.db("carDoctor").collection("order");

    //  auth related methods
    app.post("/jwt",logger, async (req, res) => {
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true, //http://localhost:5173/login jodi https hoy taile ture dibo.
          sameSite: "none",
        })
        .send({success: true});
    });

    app.post('/logout', async (req, res) => {
      const user = req.body;
      console.log("User logged out", user);
      res.clearCookie("token", {maxAge:0}).send({success : true})
    })


    // services related data
    app.get("/services",logger, async (req, res) => {
      const cursor = servicesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    //  services search id :
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };
      const result = await servicesCollection.findOne(query, options);
      res.send(result);
    });

    // get order
    app.get("/orders",logger, verifyToken, async (req, res) => {
      // console.log("milon hassan",req.query.email);
      // console.log("inside body form order", req.user.email);
      if (req.query.email !== req.user.email) {
        return res.status(403).send({message : "Forbidden access"})
      }
      let query = {};
      if (req.query.email) {
        query = { email: req.query.email };
      }
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    });

    // Order data post
    app.post("/orders", async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    // order delete one item
    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    // update order
    app.patch("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const order = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateOrder = {
        $set: {
          status: order.status,
        },
      };
      const result = await orderCollection.updateOne(filter, updateOrder);
      res.send(result);
    });

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
  res.send("welcome to car doctor server");
});

app.listen(port, () => {
  console.log(`Car Doctor listening on port ${port}`);
});
