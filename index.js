const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { query, application } = require('express');
const app = express();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server Running')
})


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).send('Unauthorized Access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Content' })
        }
        req.decoded = decoded;
        next();
    })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.mmmt3qa.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const database = client.db('CameraHut');
        const usersCollection = database.collection('users');
        const productsCollection = database.collection('products');
        const ordersCollection = database.collection('orders');
        const reportedProductsCollection = database.collection('reportedProducts');

        // Generating JWT Token for the user
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);

            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '7d' });
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        })

        // A middleware to verifyAdmin
        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user.role !== 'Admin') {
                return res.status(403).send({ message: 'Forbidden Access' })
            }
            next();
        }

        // A middleware to verifySeller
        const verifySeller = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user.role !== 'Seller') {
                return res.status(403).send({ message: 'Forbidden Access' });
            }

            next();
        }

        // A middleware to verifyBuyer
        const verifyBuyer = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user.role !== 'Buyer') {
                return res.status(403).send({ message: 'Forbidden Access' })
            }

            next();
        }

        // saving the registered user data to the database
        app.post('/users', async (req, res) => {
            const body = req.body;
            const result = await usersCollection.insertOne(body);
            res.send(result);
        })

        // add new products to the DB when seller adds a product on the client side
        app.post('/addproduct', verifyJWT, verifySeller, async (req, res) => {
            const body = req.body;
            const result = await productsCollection.insertOne(body);
            res.send(result);
        })

        // sending added products by the seller to the client side
        app.get('/my-products', verifyJWT, verifySeller, async (req, res) => {
            const email = req.query.email;
            const query = { sellerEmail: email };
            const cursor = productsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        // updating the advertisement condition for the seller
        app.put('/my-products/:id', verifyJWT, verifySeller, async (req, res) => {
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
        app.delete('/my-products/:id', verifyJWT, async (req, res) => {
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

        // sending all the sellers info to the client side
        app.get('/sellers', verifyJWT, verifyAdmin, async (req, res) => {
            const query = { role: "Seller" };
            const cursor = usersCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        // api for verfiying the seller from the admin accout
        app.put('/sellers/verify/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: 'Verified'
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        // api for deleting a seller from the admin account
        app.delete('/sellers/delete/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })

        // api for deleting a buyer from the admin account
        app.delete('/buyers/delete/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })


        // api for checking if a seller is verified or not, this api is available for everyone so no JWT implemented
        app.get('/sellers/verified/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const seller = await usersCollection.findOne(query);
            res.send({ isVerified: seller?.status === 'Verified' })
        })

        // sending all the buyers info to the client side
        app.get('/buyers', verifyJWT, verifyAdmin, async (req, res) => {
            const query = { role: "Buyer" };
            const cursor = usersCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        // taking orders from the client and saving it to the database
        app.post('/orders', verifyJWT, verifyBuyer, async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.send(result);
        })

        // my orders api based on logged in users email address
        app.get('/my-orders', verifyJWT, verifyBuyer, async (req, res) => {
            const email = req.query.email;
            const query = { buyerEmail: email };
            const cursor = ordersCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })

        // sending the confirmation if an user is buyer or not
        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send({ isBuyer: user?.role === 'Buyer' });
        })

        // sending the confirmation if an user is admin or not
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'Admin' });
        });

        // sending the confirmation if an user is seller or not
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role === 'Seller' });
        })

        // api to report an item to the admin
        app.post('/products/reported', verifyJWT, verifyBuyer, async (req, res) => {
            const reportedProduct = req.body;
            const result = await reportedProductsCollection.insertOne(reportedProduct);
            res.send(result);
        })

        // api for showing the reported products to the admin account
        app.get('/products/reported', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {};
            const cursor = reportedProductsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

    }
    finally {

    }
}

run().catch((err) => console.log(err))

app.listen(port, console.log(`Server running on port ${port}`))