const router = require('express').Router();
let Emotion = require('../models/emotion.model');
let Company = require('../models/company.model');
let User = require('../models/user.model');
const {LIMIT, PAGE} = require('./../utils/pagination.config')
const {verifyToken} = require('../utils/services');

// get emotions
// Only admins and emotions can access to this information
router.route('/').get(verifyToken, async (req, res) => {

  const userToken = await User.findById(req.payload.sub);
  const companyToken = await Company.findById(req.payload.sub);
  
  if((Boolean(userToken) && userToken.isAdmin) || Boolean(companyToken) ){

    const page = parseInt(req.query.page, 10) || PAGE;
    const limit = parseInt(req.query.limit, 10) || LIMIT;
    const companyId = req.query.companyId;

    // If companyId, the filter.
    if(companyId){
      Emotion.paginate({"companyID": {$regex: companyId}}, {limit, page})
      .then(emotions => {
        return res.status(200).json({
          success: true,
          data: emotions
        })
      })
      .catch(err => {
        return res.status(500).json({
          success: false,
          message: 'Server error: ' + err
        })
      })
    } else {
      Company.paginate({}, {limit, page})
      .then(emotions => {
        return res.status(200).json({
          success: true,
          data: emotions
        })
      })
      .catch(err => {
        return res.status(500).json({
          success: false,
          message: 'Server error: ' + err
        })
      })
    }

  } else {

    return res.status(401).json({
      success: false,
      message: `You don't have authorization to perform this action.`
    });

  }
});

// add emotions
// only companies can do this
router.route('/add').post(verifyToken, async (req, res) => {

  const companyToken = await Company.findById(req.payload.sub);

  if(Boolean(companyToken) && (String(req.body.companyID)==String(req.payload.sub))){

    // we must validate, that that company does not have another emotion called like this one.

    Emotion.find({'companyId': req.body.companyID})
    .then( items => {

      const array = items.find( item => item.name==req.body.name);

      if(array.length>0){

        return res.status(400).json({
          success: false,
          message: `There's already another emotion called like this one. Please, enter another name.`
        })

      } else {

        const {
          name, 
          companyID
        } = req.body
      
        // when we add a emotion, it will be activate.
        const newEmotion = new Emotion({
          name, 
          companyID,
          active: true,
        });

        newEmotion.save()
          .then((data) => {
            return res.status(200).json({
              success: true,
              message: `The emotion has been successfully added.`
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

// get specific emotion
// Only admins and emotions can access to this information
router.route('/:id').get(verifyToken, async (req, res) => {

  const userToken = await User.findById(req.payload.sub);
  const companyToken = await Company.findById(req.payload.sub);
  
  if((Boolean(userToken) && userToken.isAdmin) || Boolean(companyToken) ){

    Emotion.findById(req.params.id)
    .then(item => {

      if(Boolean(item)){

        return res.status(200).json({
          success: true,
          data: item
        });

      } else {

        return res.status(404).json({
          success: false,
          message: 'This item does not exist.'
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

// Delete specific emotion (we won't use this in the web page)
router.route('/:id').delete((req, res) => {

  Emotion.deleteOne({_id: req.params.id}, (err, item) => {
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
          message: 'Emotion deleted'
        });

      } else {

        return res.status(404).json({
          success: false,
          message: 'This emotion does not exist'
        });
      }
      
    }
  })

});

// Update a specific emotion
// Only the company that owns the emotion can update it.
router.route('/update/:id').post(verifyToken, async (req, res) => {

  const companyToken = await Company.findById(req.payload.sub);

  if(Boolean(companyToken) && (String(req.params.id)==String(req.payload.sub))){

    Emotion.findById(req.params.id)
    .then( item => {

      if(Boolean(item)){

        const {
          name, 
          active,
          companyID,
        } = req.body
  
        Emotion.findByIdAndUpdate(
          {_id: req.params.id}, 
          {
            name, 
            active,
            companyID,
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
            message: 'Emotion has been updated!'
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
          message: 'This emotion does not exist.'
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