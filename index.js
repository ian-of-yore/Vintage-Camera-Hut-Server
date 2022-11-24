const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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

        // sending added products by the seller to the client side
        app.get('/my-products', async (req, res) => {
            const email = req.query.email;
            const query = { sellerEmail: email };
            const cursor = productsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        // updating the advertisement condition for the seller
        app.put('/my-products/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: 'Advertised'
                }
            }
            const result = await productsCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        // sending all the advertised product to the client side
        app.get('/advertised-products', async (req, res) => {
            const query = { status: "Advertised" };
            const cursor = productsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        // delete product from seller account
        app.delete('/my-products/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id)
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        })

        // Sending data to the client side based on product category
        app.get('/category/:id', async (req, res) => {
            const categoryId = req.params.id;
            const query = { category: categoryId };
            const cursor = productsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        // sending all the users info to the client 
        app.get('/sellers', async (req, res) => {
            const query = { role: "Seller" };
            const cursor = usersCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        // sending all the sellers info to the client side
        app.get('/buyers', async (req, res) => {
            const query = { role: "Buyer" };
            const cursor = usersCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

    }
    finally {

    }
}

run().catch((err) => console.log(err))

app.listen(port, console.log(`Server running on port ${port}`))