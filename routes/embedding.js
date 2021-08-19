const router = require('express').Router();
let Embedding = require('../models/embedding.model');

router.route('/').get((req, res) => {
    Embedding.find()
    .then(embeddings => res.json(embeddings))
    .catch(err => res.status(400).json('Error: ' + err));
});

router.route('/add').post((req, res) => {
  const {emotionID, embedding,img} = req.body

  const newEmbedding = new Embedding({emotionID, embedding,img});

  newEmbedding.save()
    .then(() => res.json('Embedding added!'))
    .catch(err => res.status(400).json('Error: ' + err));
});

router.route('/:id').get((req, res) => {
    Embedding.findById(req.params.id)
    .then(embedding => res.json(embedding))
      .catch(err => res.status(400).json('Error: ' + err));
  });

router.route('/:id').delete((req, res) => {

  try {
    Embedding.deleteOne({_id: req.params.id}, (err, item) => {
      if(err){
        res.json(err);
      }
      else {
        // res.json(item);
        res.json('Embedding deleted.')
      }
    })
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
  
      return res.status(400).json({
        success: false,
        error: messages
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Server Error ' + err
      });
    }
  }

});

router.route('/update/:id').post((req, res) => {
    Embedding.findById(req.params.id)
      .then(embedding => {
        embedding.emotionID = req.body.emotionID;
        embedding.embedding = req.body.embedding;
        embedding.img = req.body.img;
  
        embedding.save()
          .then(() => res.json('Embedding updated!'))
          .catch(err => res.status(400).json('Error: ' + err));
      })
      .catch(err => res.status(400).json('Error: ' + err));
  });
module.exports = router;