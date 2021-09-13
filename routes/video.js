const router = require('express').Router();
let Video = require('../models/video.model');
let Company = require('../models/company.model');
let User = require('../models/user.model');
const {LIMIT, PAGE} = require('./../utils/pagination.config');
const {verifyToken} = require('../utils/services');

// get videos
router.route('/').get((req, res) => {

  const page = parseInt(req.query.page, 10) || PAGE;
  const limit = parseInt(req.query.limit, 10) || LIMIT;
  // const keyword = req.query.keyword;
  const companyID = req.query.companyID

  // If keyword, the filter.
  if(companyID){
    Video.paginate({"companyID": {$regex: companyID}}, {limit, page})
    .then(videos => {
      return res.status(200).json({
        success: true,
        data: videos
      })
    })
    .catch(err => {
      return res.status(500).json({
        success: false,
        message: 'Server error: ' + err
      })
    })
  } else {
    Video.paginate({}, {limit, page})
    .then(videos => {
      return res.status(200).json({
        success: true,
        data: videos
      })
    })
    .catch(err => {
      return res.status(500).json({
        success: false,
        message: 'Server error: ' + err
      })
    })
  }
});

// add videos
// only admins and companies can perform this action
router.route('/add').post(verifyToken, async (req, res) => {

  const userToken = await User.findById(req.payload.sub);
  const companyToken = await Company.findById(req.payload.sub);
  
  if( (Boolean(userToken) && userToken.isAdmin) || (Boolean(companyToken) && String(req.payload.sub) == String(req.body.companyID)) ){

    // We must validate that the company does not have another video with that name.

    Video.find({'companyID': req.body.companyID})
    .then( items => {

      const array = items.find( item => item.name==req.body.name);

      if(Boolean(array) && array.length>0){

        return res.status(400).json({
          success: false,
          message: `There's already another video called like this one. Please, enter another name.`
        });

      } else {

        const {
          name,
          companyID,
          link,
          mainImg,
          duration,
          publishDate,
        } = req.body
    
        const newVideo = new Video({
          name, 
          active: true,
          companyID,
          link,
          mainImg,
          duration,
          publishDate
        });

        newVideo.save()
        .then((data) => {
          return res.status(200).json({
            success: true,
            message: `The video has been successfully added.`
          })
        })
        .catch(err => {
          return res.status(500).json({
            success: false,
            message: 'Server error: ' + err
          });
        });

      }

    })
    .catch( err => {

      return res.status(500).json({
        success: false,
        message: 'Server error: ' + err
      });

    })

  } else {

    return res.status(401).json({
      success: false,
      message: `You don't have authorization to perform this action.`
    });

  }

});

// get specific video
router.route('/:id').get((req, res) => {

  Video.findById(req.params.id)
  .then(item => {

    if(Boolean(item)){

      return res.status(200).json({
        success: true,
        data: item
      });

    } else {

      return res.status(404).json({
        success: false,
        message: 'This video does not exist.'
      })

    }
  })
  .catch(err => {
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + err
    })
  });

});

// Delete specific video (we won't use this in the web page)
router.route('/:id').delete((req, res) => {

  Video.deleteOne({_id: req.params.id}, (err, item) => {
    if(err){

      return res.status(500).json({
        success: false,
        message: 'Server error: ' + err
      });

    } else {

      // Check if we found the id and deleted the item
      if(item.deletedCount==1){

        return res.status(200).json({
          success: true,
          message: 'Video deleted.'
        });

      } else {

        return res.status(404).json({
          success: false,
          message: 'This video does not exist.'
        });
      }
      
    }
  });

});

// update an specific video
// only admins and companies that owns the video can perform this action
router.route('/update/:id').post(verifyToken, async (req, res) => {

  const userToken = await User.findById(req.payload.sub);
  const companyToken = await Company.findById(req.payload.sub);
  
  if( (Boolean(userToken) && userToken.isAdmin) || (Boolean(companyToken) && String(req.payload.sub) == String(req.body.companyID)) ){

    Video.findById(req.params.id)
    .then( item => {

      if(Boolean(item)){

        const {
          name, 
          active,
          companyID,
          link,
          mainImg,
          duration,
          publishDate
        } = req.body
  
        Video.findByIdAndUpdate(
          {_id: req.params.id}, 
          {
            name, 
            active,
            companyID,
            link,
            mainImg,
            duration,
            publishDate
          }, 
          {
            returnOriginal: false, 
            useFindAndModify: false 
          }
        )
        .then((data) => {
          return res.status(200).json({
            success: true,
            data: data,
            message: 'Video has been updated!'
          })
        })
        .catch(err => {
          return res.status(500).json({
            success: false,
            message: 'Server error: ' + err
          })
        });

      } else {

        return res.status(404).json({
          success: false,
          message: 'This video does not exist.'
        });

      }

    })
    .catch( err => {
      return res.status(500).json({
        success: false,
        message: 'Server error: ' + err
      });
    });

  } else {

    return res.status(401).json({
      success: false,
      message: `You don't have authorization to perform this action.`
    });

  }
  
});

module.exports = router;