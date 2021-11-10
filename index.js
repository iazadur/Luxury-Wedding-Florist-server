const express = require('express')
const cors = require('cors')
const app = express()
require('dotenv').config()
const { MongoClient } = require('mongodb');
const admin = require("firebase-admin");

// DB_USER=doctorsDB
// DB_PASS=YxyuBKsMkQ5UGHAw

const port = process.env.PORT || 5000

// doctors-portal-2a835-firebase-adminsdk-gksn2-8223ec5645.json


const serviceAccount = require("./doctors-portal-2a835-firebase-adminsdk-gksn2-8223ec5645.json");

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
        const database = client.db('doctors_portal');
        const appointmentsCollection = database.collection('appointments')
        const usersCollection = database.collection('users')

        // Insert Appointments into Database
        app.post('/appointments', async (req, res) => {
            const appointment = req.body
            const result = await appointmentsCollection.insertOne(appointment)
            res.json(result)
        })

        // Get Appointments into Database
        app.get('/appointments',verifyToken, async (req, res) => {
            const email = req.query.email
            const date = new Date(req.query.date).toLocaleDateString()
            const query = { email: email, date: date }
            const cursor = appointmentsCollection.find(query)
            const appointments = await cursor.toArray()
            // const appointments = await appointmentsCollection.find({ email: req.query.email }).toArray()
            res.json(appointments)
        })

        // Get Admin or normal users into UsersCollection
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let isAdmin = false
            if (user?.role === 'admin') {
                isAdmin = true
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