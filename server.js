
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const exphbs = require('express-handlebars');
const app = express();
const port = process.env.PORT || 5000;

// View engine setup
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars'); 

require('dotenv').config();

app.use(cors());
app.use(express.json());

const uri = process.env.ATLAS_URI;
mongoose.connect(uri, { useNewUrlParser: true, useCreateIndex: true }
);
const connection = mongoose.connection;
connection.once('open', () => {
  console.log("MongoDB database connection established successfully");
})

const accountRouter = require('./routes/account');
const authRouter = require('./routes/auth');
const companyRouter = require('./routes/company');
const embeddingRouter = require('./routes/embedding');
const emotionRouter = require('./routes/emotion');
const userRouter = require('./routes/user');
const videoRouter = require('./routes/video');
const viewRouter = require('./routes/view');

app.use('/account', accountRouter);
app.use('/login', authRouter);
app.use('/companies', companyRouter);
app.use('/embeddings', embeddingRouter);
app.use('/emotions', emotionRouter);
app.use('/users', userRouter);
app.use('/videos', videoRouter);
app.use('/views', viewRouter);

app.get('/', (req, res) => {
  res.send('Emotion AI API')
})
app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});