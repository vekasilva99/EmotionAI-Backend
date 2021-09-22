const router = require('express').Router();
let Video = require('../models/video.model');
let Company = require('../models/company.model');
let User = require('../models/user.model');
let View = require('../models/view.model');
let Emotion = require('../models/emotion.model');
const {LIMIT, PAGE} = require('./../utils/pagination.config');
const {verifyToken, cosinesim} = require('../utils/services');
const Embedding = require('../models/embedding.model');
const mongoose = require('mongoose');


// get videos
router.route('/').get((req, res) => {

  const page = parseInt(req.query.page, 10) || PAGE;
  const limit = parseInt(req.query.limit, 10) || LIMIT;
  // const keyword = req.query.keyword;
  const companyID = req.query.companyID
  const onlyActive = (req.query.onlyActive && req.query.onlyActive=='true') ? true : false;

  let query = {};

  if(companyID){
    query.companyID = companyID;
  }
  if(onlyActive){
    query.active = true;
  }

  Video.paginate(query, {limit, page})
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

      if(Boolean(array)){

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

router.route('/statistics/emotions-in-video').get(verifyToken, async(req, res) => {

  const {
    videoId,
    // emotions is an array with the id of the emotions the user selected
    emotions,
  } = req.body;

  View.find({'videoID': videoId})
  .then( async (items) => {
 
    try {

      // Get the values of the column "time" so later we can group them accroding to this
      timeValues = await View.distinct("time", {'videoID': videoId});
      // We will save here the emotions with their embeddings...
      emotionValues = [];
      // We will save the results we will send here
      queryResultValues = [];

      // We must turn the Strings to ObjectsId so Mongo can recognize them
      emotionIds = emotions.map(emotion => {
        return mongoose.Types.ObjectId(emotion)
      })

      // Find the emotions the user selected and check if they exist so we can proceed...
      const emotionsFound = await Emotion.find({"_id": {"$in": emotionIds}});

      if((Boolean(emotionsFound) && Boolean(emotions)) && (emotionsFound.length == emotions.length)){

        // Once we checked the emotions exists, we must validate that all of them are active...
        const emotionsInactive = emotionsFound.filter( emotion => !emotion.active);
        
        if(!Boolean(emotionsInactive) || (Boolean(emotionsInactive) && emotionsInactive.length==0)){

          // Get all the embeddings that belong to every emotion the user selected.
          for(const emotion of emotionsFound){

            const embeddings = await Embedding.find({emotionID: emotion._id});
            emotionValues.push({
              _id: emotion._id,
              name: emotion.name,
              embeddings: embeddings.map( emb => emb.embedding)
            })

          }

          // We will save views by time. 
          // Every object here has the time and an array with the views that has info about that if it belongs to one emotion.
          viewsByTime = []
          timeValues.map( async(time) => {

            // For every "time" value we have, we get the views
            viewsSelected = items.filter( item => item.time == time);
            explicitViews = []
            timeObject = {
              time: time,
              emotionResults: []
            };

            viewsSelected.map( view => {

              // console.log('VIEW IS', view._id);
              belongsToEmotionValues = [];

              emotionValues.map( emotion => {

                cont = 0;
                belongsToEmotion = false;

                while(!belongsToEmotion && cont<emotion.embeddings.length){
                  const sim = cosinesim(emotion.embeddings[cont], view.embedding);
                  // console.log('sim is', sim);
                  // if(sim>0.99){
                  if(sim>0.52){
                    belongsToEmotion = true;
                  }
                  cont = cont + 1;
                }

                const viewObj = {
                  emotion: emotion._id,
                  belongsToEmotion: belongsToEmotion,
                }

                belongsToEmotionValues.push(viewObj)

              

                // array = emotion.embeddings.map( emb => {
                //   const sim = cosinesim(emb, view.embedding)
                //   if(sim>0,99){
                //     return true
                //   } else {
                //     return false
                //   }
                // });

                

              });

              explicitViews.push(belongsToEmotionValues)

              // console.log('');
              // console.log('View values');
              // console.log(belongsToEmotionValues);

              
            })

            // console.log('Time', timeObject.time);

            emotionValues.map( emotion => {

              // console.log('Emotion', emotion.name, emotion._id);
              // console.log('');
              // console.log('Explicit views');
              // console.log('');
              // console.log(explicitViews);


              const viewsSelected = []

              explicitViews.map( viewObj => {

                const filtered = viewObj.filter(emotionInfo => ((String(emotionInfo.emotion)==String(emotion._id) && emotionInfo.belongsToEmotion)))
                if(Boolean(filtered) && filtered.length>0){
                  viewsSelected.push(filtered)
                }
              })

              timeObject.emotionResults.push({
                "_id": emotion._id,
                "name": emotion.name,
                "views": Number(viewsSelected.length) || 0,
              })
            })
            viewsByTime.push(timeObject);
          });

          

          return res.status(500).json({
            success: true,
            message: '',
            data: viewsByTime
          });

        } else {

          let text = '';
          emotionsInactive.map( (emotion, index) => {
            if(index!=emotionsInactive.length-1){
              text = text + emotion.name + ', '
            }else{
              text = text + emotion.name
            }
          })
          return res.status(403).json({
            success: false,
            message: `This/these emotion/s is/are inactive: ${text}. You can not select any inactive amotions.`,
          });

        }

      } else {
        return res.status(404).json({
          success: false,
          message: `One (or more) of the emotions you selected does not exist. Please, select at least one of them (it has to be an active one).`,
        });
      }

    } catch (err) {
      return res.status(500).json({
        success: false,
        message: 'Server error: ' + err
      });
    }
  })
  .catch( err => {
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + err
    });
  })
});

router.route('/statistics/emotions-in-video/2').get(verifyToken, async(req, res) => {
  const {
    videoId,
    // emotions is an array with the id of the emotions the user selected
    emotions,
  } = req.body;

  
});

module.exports = router;