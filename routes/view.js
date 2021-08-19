const router = require('express').Router();
let View = require('../models/view.model');

router.route('/').get((req, res) => {
    View.find()
    .then(views => res.json(views))
    .catch(err => res.status(400).json('Error: ' + err));
});

router.route('/add').post((req, res) => {
  const {videoID,time,embedding,attention,age,gender,country} = req.body

  const newView = new View({videoID,time,embedding,attention,age,gender,country});

  newView.save()
    .then(() => res.json('View added!'))
    .catch(err => res.status(400).json('Error: ' + err));
});

router.route('/:id').get((req, res) => {
  View.findById(req.params.id)
  .then(view => res.json(view))
    .catch(err => res.status(400).json('Error: ' + err));
});

router.route('/:id').delete((req, res) => {

  try {
    View.deleteOne({_id: req.params.id}, (err, item) => {
      if(err){
        res.json(err);
      }
      else {
        // res.json(item);
        res.json('View deleted.')
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
  View.findById(req.params.id)
    .then(view => {
      view.videoID = req.body.videoID;
      view.time = req.body.time;
      view.embedding = req.body.embedding;
      view.attention = req.body.attention;
      view.age = req.body.age;
      view.gender = req.body.gender;
      view.country = req.body.country;

      View.save()
        .then(() => res.json('View updated!'))
        .catch(err => res.status(400).json('Error: ' + err));
      })
    .catch(err => res.status(400).json('Error: ' + err));
});


module.exports = router;