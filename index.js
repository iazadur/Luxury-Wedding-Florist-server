const express = require('express')
const cors = require('cors')
const app = express()
require('dotenv').config()
const { MongoClient } = require('mongodb');
const admin = require("firebase-admin");
const ObjectId = require('mongodb').ObjectId;

// DB_USER=luxurydb
// DB_PASS=sUwNLLDo5MjSYnDo

const port = process.env.PORT || 5000

// require("./niche-flowers-firebase-adminsdk-p3l1w-e7fdcaea81.json");


const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


app.use(cors())
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ddn3a.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function verifyToken(req, res, next) {
    if (req?.body?.authorization?.startsWith('Bearer ')) {
        const token = req?.body?.authorization?.split(' ')[1]
        try {
            const decodedUser = await admin.auth().verifyIdToken(token)
            req.decodedEmail = decodedUser.email
        } catch (error) {

        }
    }
    next()
}

async function run() {
    try {
        await client.connect();
        const database = client.db('luxury_florist');
        const usersCollection = database.collection('users')
        const productsCollection = database.collection('products')
        const ordersCollection = database.collection('orders')
        const reviewsCollection = database.collection('review')

        // Insert a Product into Database
        app.post('/products', async (req, res) => {
            const product = req.body
            const result = await productsCollection.insertOne(product)
            res.json(result)
        })

        // Read all Product into Database
        app.get('/products', async (req, res) => {
            const result = await productsCollection.find({}).toArray()
            res.json(result)
        })


        // Read a Product into Productcollection
        app.get("/products/:id", async (req, res) => {
            const result = await productsCollection.findOne({
                _id: ObjectId(req.params.id),
            });
            res.send(result);
        });


        // Delete Product into Productcollection
        app.delete("/products/:id", async (req, res) => {
            const result = await productsCollection.deleteOne({
                _id: ObjectId(req.params.id),
            });
            res.send(result);
        });


        //   Review

        // Insert a Review into Database
        app.post('/review', async (req, res) => {
            const review = req.body
            const result = await reviewsCollection.insertOne(review)
            res.json(result)
        })

        // Read all Review into Database
        app.get('/review', async (req, res) => {
            const result = await reviewsCollection.find({}).toArray()
            res.json(result)
        })


        // Delete Review into Ordercollection
        app.delete("/review/:id", async (req, res) => {
            const result = await reviewsCollection.deleteOne({
                _id: ObjectId(req.params.id),
            });
            res.send(result);
        });




        // ORDERS


        // Insert a Order into ordersCollections
        app.post('/order', async (req, res) => {
            const order = req.body
            const result = await ordersCollection.insertOne(order)
            res.json(result)
        })

        // Get a user Orders into ordersCollections
        app.get('/orders/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const orders = await ordersCollection.find(query).toArray()
            res.json(orders)
        })

        // Read all Product into Database
        app.get('/orders', async (req, res) => {
            const result = await ordersCollection.find({}).toArray()
            res.json(result)
        })

        // Delete Product into Productcollection
        app.delete("/orders/:id", async (req, res) => {
            const result = await ordersCollection.deleteOne({
                _id: ObjectId(req.params.id),
            });
            res.send(result);
        });














        // Get Appointments into Database
        // app.get('/appointments', verifyToken, async (req, res) => {
        //     const email = req.query.email
        //     const date = new Date(req.query.date).toLocaleDateString()
        //     const query = { email: email, date: date }
        //     const cursor = appointmentsCollection.find(query)
        //     const appointments = await cursor.toArray()
        //     // const appointments = await appointmentsCollection.find({ email: req.query.email }).toArray()
        //     res.json(appointments)
        // })

        // Get Admin or normal users into UsersCollection returning value true or false
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let isAdmin = false
            if (user?.role === 'admin') {
                isAdmin = true
                console.log(isAdmin);
            }

            res.json({ admin: isAdmin })
        })


        // Insert New Users into usersCollection
        app.post('/users', async (req, res) => {
            const result = await usersCollection.insertOne(req.body)
            res.json(result)
        })
        // update || intsert New Users into usersCollection
        app.put('/users', async (req, res) => {
            const user = req.body
            const filter = { email: user.email }
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result)
        })

        // Update Admin role into usersCollection
        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body
            console.log(user);
            const requester = req.decodedEmail
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester })
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email }
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    console.log(result);
                    res.json(result)
                }
            }
            else {
                res.status(403).json({ message: 'you do not access to make Admin' })
            }


        })



    } finally {
        // Ensures that the client will close when you finish/error
        //   await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('this is node server')
})

app.listen(port, () => {
    console.log('listening at', port);
})