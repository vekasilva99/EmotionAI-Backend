const router = require('express').Router();
let Video = require('../models/video.model');

router.route('/').get((req, res) => {
    Video.find()
    .then(videos => res.json(videos))
    .catch(err => res.status(400).json('Error: ' + err));
});

router.route('/add').post((req, res) => {
  const {name,active,companyID,link,mainImg,duration,publishDate,file} = req.body

  const newVideo = new Video({name,active,companyID,link,mainImg,duration,publishDate,file});

  newVideo.save()
    .then(() => res.json('Video added!'))
    .catch(err => res.status(400).json('Error: ' + err));
});

router.route('/:id').get((req, res) => {
    Video.findById(req.params.id)
    .then(video => res.json(video))
      .catch(err => res.status(400).json('Error: ' + err));
  });

router.route('/:id').delete((req, res) => {

  try {
    Video.deleteOne({_id: req.params.id}, (err, item) => {
      if(err){
        res.json(err);
      }
      else {
        // res.json(item);
        res.json('Video deleted.')
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
    Video.findById(req.params.id)
      .then(video => {
        video.name = req.body.name;
        video.companyID = req.body.companyID;
        video.link = req.body.link;
        video.active = req.body.active;
        video.mainImg = req.body.mainImg;
        video.duration = req.body.duration;
        video.publishDate = req.body.publishDate;
        video.file = req.body.file;
  
        video.save()
          .then(() => res.json('Video updated!'))
          .catch(err => res.status(400).json('Error: ' + err));
      })
      .catch(err => res.status(400).json('Error: ' + err));
  });
module.exports = router;