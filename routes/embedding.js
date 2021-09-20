const router = require('express').Router();
let Embedding = require('../models/embedding.model');
let Company = require('../models/company.model');
let User = require('../models/user.model');
const {LIMIT, PAGE} = require('./../utils/pagination.config')
const {verifyToken} = require('../utils/services');

// Get embeddings
// Only companies and Admins can access to this information
router.route('/').get(verifyToken, async (req, res) => {

  const userToken = await User.findById(req.payload.sub);
  const companyToken = await Company.findById(req.payload.sub);

  if( Boolean(companyToken) || ( Boolean(userToken) && userToken.isAdmin) ){

    const page = parseInt(req.query.page, 10) || PAGE;
    const limit = parseInt(req.query.limit, 10) || LIMIT;
    const emotionID = req.query.emotionID;

    if(emotionID){
      Embedding.paginate({"emotionID": emotionID}, {limit, page})
      .then(embeddings => {
        return res.status(200).json({
          success: true,
          data: embeddings
        })
      })
      .catch(err => {
        return res.status(500).json({
          success: false,
          message: 'Server error: ' + err
        })
      })
    } else {
      Embedding.paginate({}, {limit, page})
      .then(embeddings => {
        return res.status(200).json({
          success: true,
          data: embeddings
        })
      })
      .catch(err => {
        return res.status(500).json({
          success: false,
          message: 'Server error: ' + err
        })
      })
    }

  }else{
    return res.status(401).json({
      success: false,
      message: `You don't have authorization to perform this action.`
    })
  }
  
});

// Add new embedding
router.route('/add').post((req, res) => {

  const {
    emotionID, 
    embedding,
    img
  } = req.body

  const newEmbedding = new Embedding({
    emotionID, 
    embedding,
    img
  });

  newEmbedding.save()
  .then((data) => {
    return res.status(200).json({
      success: true,
      message: `The embedding has been added.`
    })
  })
  .catch(err => {
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + err
    });
  });
});

// Get a specific embedding
// Only companies and Admins can access to this information
router.route('/:id').get(verifyToken, async (req, res) => {

  const userToken = await User.findById(req.payload.sub);
  const companyToken = await Company.findById(req.payload.sub);
  
  if((Boolean(userToken) && userToken.isAdmin) || Boolean(companyToken) ){

    Embedding.findById(req.params.id)
    .then(embedding => {

      if(Boolean(embedding)){

        return res.status(200).json({
          success: true,
          data: embedding
        });

      } else {

        return res.status(404).json({
          success: false,
          message: 'This embedding does not exist.'
        })

      }
    })
    .catch(err => {
      return res.status(500).json({
        success: false,
        message: 'Server error: ' + err
      })
    });

  } else {

    return res.status(401).json({
      success: false,
      message: `You don't have authorization to perform this action.`
    })

  }
});

// Delete specific embedding (we won't use this in the web page)
router.route('/:id').delete((req, res) => {

  Embedding.deleteOne({_id: req.params.id}, (err, item) => {
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
          message: 'Embedding deleted'
        });

      } else {

        return res.status(404).json({
          success: false,
          message: 'This embedding does not exist'
        });
      }
      
    }
  })

  

});

// Update a specific embedding
// Only companies and Admins can access to this information
router.route('/update/:id').post(verifyToken, async (req, res) => {

  const userToken = await User.findById(req.payload.sub);
  const companyToken = await Company.findById(req.payload.sub);
  
  if((Boolean(userToken) && userToken.isAdmin) || Boolean(companyToken) ){

    Embedding.findById(req.params.id)
    .then( item => {

      if(Boolean(item)){

        const {
          emotionID, 
          embedding,
          img
        } = req.body
  
        Embedding.findByIdAndUpdate(
          {_id: req.params.id}, 
          {
            emotionID, 
            embedding,
            img
  
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
            message: 'Embedding has been updated!'
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
          message: 'This embedding does not exist'
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

module.exports = router;