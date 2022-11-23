const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server Running')
})


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.mmmt3qa.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const database = client.db('CameraHut');
        const usersCollection = database.collection('users');
        const productsCollection = database.collection('products');

        // saving the registered user data to the database
        app.post('/users', async (req, res) => {
            const body = req.body;
            const result = await usersCollection.insertOne(body);
            res.send(result);
        })

        // add new products to the DB when seller adds a product on the client side
        app.post('/addproduct', async (req, res) => {
            const body = req.body;
            const result = await productsCollection.insertOne(body);
            res.send(result);
        })

    }
    finally {

    }
}

run().catch((err) => console.log(err))

app.listen(port, console.log(`Server running on port ${port}`))