
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = process.env.ATLAS_URI;
mongoose.connect(uri, { useNewUrlParser: true, useCreateIndex: true }
);
const connection = mongoose.connection;
connection.once('open', () => {
  console.log("MongoDB database connection established successfully");
})

const companyRouter = require('./routes/company')
const embeddingRouter = require('./routes/embedding')
const emotionRouter = require('./routes/emotion')
const userRouter = require('./routes/user')
const videoRouter = require('./routes/video')
const viewRouter = require('./routes/view')

app.use('/company', companyRouter);
app.use('/embedding', embeddingRouter);
app.use('/emotion', emotionRouter);
app.use('/user', userRouter);
app.use('/video', videoRouter);
app.use('/view', viewRouter);


app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});