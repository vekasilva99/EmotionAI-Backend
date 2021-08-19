const router = require('express').Router();
let Emotion = require('../models/emotion.model');

router.route('/').get((req, res) => {
    Emotion.find()
    .then(emotions => res.json(emotions))
    .catch(err => res.status(400).json('Error: ' + err));
});

router.route('/add').post((req, res) => {
  const {name,active,companyID} = req.body

  const newEmotion = new Emotion({name,active,companyID});

  newEmotion.save()
    .then(() => res.json('Emotion added!'))
    .catch(err => res.status(400).json('Error: ' + err));
});

router.route('/:id').get((req, res) => {
    Emotion.findById(req.params.id)
    .then(emotion => res.json(emotion))
      .catch(err => res.status(400).json('Error: ' + err));
  });

router.route('/:id').delete((req, res) => {

  try {
    Emotion.deleteOne({_id: req.params.id}, (err, item) => {
      if(err){
        res.json(err);
      }
      else {
        // res.json(item);
        res.json('Emotion deleted.')
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
    Emotion.findById(req.params.id)
      .then(emotion => {
        emotion.name = req.body.name;
        emotion.active = req.body.active;
        emotion.companyID = req.body.companyID;

  
        emotion.save()
          .then(() => res.json('Emotion updated!'))
          .catch(err => res.status(400).json('Error: ' + err));
      })
      .catch(err => res.status(400).json('Error: ' + err));
  });
module.exports = router;