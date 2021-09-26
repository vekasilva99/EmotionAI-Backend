const router = require('express').Router();
let Company = require('../models/company.model');
let User = require('../models/user.model');
let Video = require('../models/video.model');
let View = require('../models/view.model');
let Emotion = require('../models/emotion.model');
const {LIMIT, PAGE} = require('./../utils/pagination.config');
const {verifyToken, cosinesim} = require('../utils/services');
const mongoose = require('mongoose');

// This is the main query, where we get information about what are the emotions that are in the video
// people/time (each emotion)
router.route('/emotions-in-video').get(verifyToken, async(req, res) => {

    const {
        videoID,
      // emotions is an array with the id of the emotions the user selected
        emotions,
    } = req.body;
  
    View.find({'videoID': videoID})
    .then( async (items) => {
   
      try {
  
        // Get the values of the column "time" so later we can group them accroding to this
        // timeValues = await View.distinct("time", {'videoID': mongoose.Types.ObjectId(videoID)});
        timeValues = await View.distinct("time", {'videoID': videoID});

        // We will save the results we will send here
        queryResultValues = [];
  
        // We must turn the Strings to ObjectsId so Mongo can recognize them
        emotionIds = emotions.map(emotion => {
          return mongoose.Types.ObjectId(emotion)
        })
  
        // Find the emotions the user selected and check if they exist so we can proceed...
        const emotionsFound = await Emotion.aggregate([
            {$match: {_id: {"$in": emotionIds}}},
            {
              $lookup: {
                from: "embeddings",
                localField: "_id",
                foreignField: "emotionID",
                as: "embeddings",
              }
            }
          ]);
  
        if((Boolean(emotionsFound) && Boolean(emotions)) && (emotionsFound.length == emotions.length)){
  
          // Once we checked the emotions exists, we must validate that all of them are active...
          const emotionsInactive = emotionsFound.filter( emotion => !emotion.active);
          
          if(!Boolean(emotionsInactive) || (Boolean(emotionsInactive) && emotionsInactive.length==0)){
  
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
  
                belongsToEmotionValues = [];
  
                emotionsFound.map( emotion => {
  
                  cont = 0;
                  belongsToEmotion = false;
  
                  while(!belongsToEmotion && cont<emotion.embeddings.length){
  
                    const sim = cosinesim(emotion.embeddings[cont].embedding, view.embedding);
                    if(sim>0.99){
                    // if(sim>0.52){
                      belongsToEmotion = true;
                    }
                    cont = cont + 1;
                  }
  
                  const viewObj = {
                    emotion: emotion._id,
                    belongsToEmotion: belongsToEmotion,
                  }
  
                  belongsToEmotionValues.push(viewObj)    
  
                });
  
                explicitViews.push(belongsToEmotionValues)
  
              })
  
              emotionsFound.map( emotion => {
  
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
  
            return res.status(200).json({
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

// This is a query that returns how many people of each country has watched the video
// They are sorted (descending), which means that the first country is the one that has more views
router.route('/country').get(verifyToken, async(req, res) => {

    const {
        videoID,
    } = req.body;

    try {

        // Check if the video exist and if it is active
        const videoFound = await Video.findById(videoID);

        if( videoFound && videoFound.active){

            if(String(videoFound.companyID) == String(req.payload.sub)){

                // We only to count the countries in one of the timeValues we have
                timeValues = await View.distinct("time", {'videoID': videoID});

                View.aggregate([
                    {
                        $match: {$and: [{videoID: mongoose.Types.ObjectId(videoID)}, {time: timeValues[1]}]}
                    },
                    { 
                        $group: { 
                            _id: "$country", 
                            total: { $sum: 1 } 
                        }
                    },
                    {
                        $sort : { total : -1 } 
                    }
                ]).then( data => {

                    return res.status(200).json({
                        success: true,
                        data: data
                    });

                }).catch( err => {
                    return res.status(500).json({
                        success: false,
                        message: 'Server error: ' + err
                    });
                })

            } else {
                return res.status(403).json({
                    success: false,
                    message: `You don't have authorization to perform this action.` 
                });
            }

        } else {

            return res.status(404).json({
                success: false,
                message: 'The video you selected does not exist or it is inactive. Please, select one that exists and it is active.'
            });
        }


    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + err
        });
    }

});

// This is a query that returns how many people of each country has watched the video
// They are sorted (descending), which means that the first gender is the one that has more views
router.route('/gender').get(verifyToken, async(req, res) => {

    const {
        videoID,
    } = req.body;

    try {

        // Check if the video exist and if it is active
        const videoFound = await Video.findById(videoID);

        if( videoFound && videoFound.active){

            if(String(videoFound.companyID) == String(req.payload.sub)){

                // We only to count the countries in one of the timeValues we have
                timeValues = await View.distinct("time", {'videoID': videoID});

                View.aggregate([
                    {
                        $match: {$and: [{videoID: mongoose.Types.ObjectId(videoID)}, {time: timeValues[1]}]}
                    },
                    { 
                        $group: { 
                            _id: "$gender", 
                            total: { $sum: 1 } 
                        }
                    },
                    {
                        $sort : { total : -1 } 
                    }
                ]).then( data => {

                    return res.status(200).json({
                        success: true,
                        data: data
                    });

                }).catch( err => {
                    return res.status(500).json({
                        success: false,
                        message: 'Server error: ' + err
                    });
                })

            } else {
                return res.status(403).json({
                    success: false,
                    message: `You don't have authorization to perform this action.` 
                });
            }

        } else {

            return res.status(404).json({
                success: false,
                message: 'The video you selected does not exist or it is inactive. Please, select one that exists and it is active.'
            });
        }


    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + err
        });
    }

});

// This is a query that returns how many people of each country has watched the video
// They are sorted (descending), which means that the first range age is the one that has more views
router.route('/age').get(verifyToken, async(req, res) => {

    const {
        videoID,
    } = req.body;

    try {

        // Check if the video exist and if it is active
        const videoFound = await Video.findById(videoID);

        if( videoFound && videoFound.active){

            if(String(videoFound.companyID) == String(req.payload.sub)){

                // We only to count the countries in one of the timeValues we have
                timeValues = await View.distinct("time", {'videoID': videoID});

                View.aggregate([
                    {
                        $match: {$and: [{videoID: mongoose.Types.ObjectId(videoID)}, {time: timeValues[1]}]}
                    },
                    {
                        $project: {    
                            "ageRange": {
                                $concat: [
                                    { $cond: [{$lt: ["$age",0]}, "Unknown", ""]}, 
                                    { $cond: [{$and:[ {$gte:["$age", 0 ]}, {$lt: ["$age", 12]}]}, "Kids", ""] },
                                    { $cond: [{$and:[ {$gte:["$age",12]}, {$lte:["$age", 21]}]}, "Teenagers", ""]},
                                    { $cond: [{$and:[ {$gt:["$age",21]}, {$lt:["$age", 60]}]}, "Adults", ""]},
                                    { $cond: [{$gte:["$age",60]}, "Elderly", ""]}
                                ]
                            }  
                        }    
                    },
                    { 
                        $group: { 
                            _id: "$ageRange", 
                            total: { $sum: 1 } 
                        }
                    },
                    {
                        $sort : { total : -1 } 
                    }
                ]).then( data => {

                    return res.status(200).json({
                        success: true,
                        data: data
                    });

                }).catch( err => {
                    return res.status(500).json({
                        success: false,
                        message: 'Server error: ' + err
                    });
                })

            } else {
                return res.status(403).json({
                    success: false,
                    message: `You don't have authorization to perform this action.` 
                });
            }

        } else {

            return res.status(404).json({
                success: false,
                message: 'The video you selected does not exist or it is inactive. Please, select one that exists and it is active.'
            });
        }


    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + err
        });
    }

});

// Query that returns which country has more people
router.route('/top-results/country').get(verifyToken, async(req, res) => {

    const {
        videoID,
    } = req.body;

    try {

        // Check if the video exist and if it is active
        const videoFound = await Video.findById(videoID);

        if( videoFound && videoFound.active){

            if(String(videoFound.companyID) == String(req.payload.sub)){

                // We only to count the countries in one of the timeValues we have
                timeValues = await View.distinct("time", {'videoID': videoID});

                View.aggregate([
                    {
                        $match: {$and: [{videoID: mongoose.Types.ObjectId(videoID)}, {time: timeValues[1]}]}
                    },
                    { 
                        $group: { 
                            _id: "$country", 
                            total: { $sum: 1 } 
                        }
                    },
                    {
                        $sort : { total : -1 } 
                    },
                    { $limit : 1 }
                ]).then( data => {

                    return res.status(200).json({
                        success: true,
                        data: data
                    });

                }).catch( err => {
                    return res.status(500).json({
                        success: false,
                        message: 'Server error: ' + err
                    });
                })

            } else {
                return res.status(403).json({
                    success: false,
                    message: `You don't have authorization to perform this action.` 
                });
            }

        } else {

            return res.status(404).json({
                success: false,
                message: 'The video you selected does not exist or it is inactive. Please, select one that exists and it is active.'
            });
        }


    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + err
        });
    }

});

// Query that returns which range age has more people
router.route('/top-results/age').get(verifyToken, async(req, res) => {

    const {
        videoID,
    } = req.body;

    try {

        // Check if the video exist and if it is active
        const videoFound = await Video.findById(videoID);

        if( videoFound && videoFound.active){

            if(String(videoFound.companyID) == String(req.payload.sub)){

                // We only to count the countries in one of the timeValues we have
                timeValues = await View.distinct("time", {'videoID': videoID});

                View.aggregate([
                    {
                        $match: {$and: [{videoID: mongoose.Types.ObjectId(videoID)}, {time: timeValues[1]}]}
                    },
                    {
                        $project: {    
                            "ageRange": {
                                $concat: [
                                    { $cond: [{$lt: ["$age",0]}, "Unknown", ""]}, 
                                    { $cond: [{$and:[ {$gte:["$age", 0 ]}, {$lt: ["$age", 12]}]}, "Kids", ""] },
                                    { $cond: [{$and:[ {$gte:["$age",12]}, {$lte:["$age", 21]}]}, "Teenagers", ""]},
                                    { $cond: [{$and:[ {$gt:["$age",21]}, {$lt:["$age", 60]}]}, "Adults", ""]},
                                    { $cond: [{$gte:["$age",60]}, "Elderly", ""]}
                                ]
                            }  
                        }    
                    },
                    { 
                        $group: { 
                            _id: "$ageRange", 
                            total: { $sum: 1 } 
                        }
                    },
                    {
                        $sort : { total : -1 } 
                    },
                    { $limit : 1 }
                ]).then( data => {

                    return res.status(200).json({
                        success: true,
                        data: data
                    });

                }).catch( err => {
                    return res.status(500).json({
                        success: false,
                        message: 'Server error: ' + err
                    });
                })

            } else {
                return res.status(403).json({
                    success: false,
                    message: `You don't have authorization to perform this action.` 
                });
            }

        } else {

            return res.status(404).json({
                success: false,
                message: 'The video you selected does not exist or it is inactive. Please, select one that exists and it is active.'
            });
        }


    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + err
        });
    }

});

// Query that returns which gender has more people
router.route('/top-results/gender').get(verifyToken, async(req, res) => {

    const {
        videoID,
    } = req.body;

    try {

        // Check if the video exist and if it is active
        const videoFound = await Video.findById(videoID);

        if( videoFound && videoFound.active){

            if(String(videoFound.companyID) == String(req.payload.sub)){

                // We only to count the countries in one of the timeValues we have
                timeValues = await View.distinct("time", {'videoID': videoID});

                View.aggregate([
                    {
                        $match: {$and: [{videoID: mongoose.Types.ObjectId(videoID)}, {time: timeValues[1]}]}
                    },
                    { 
                        $group: { 
                            _id: "$gender", 
                            total: { $sum: 1 } 
                        }
                    },
                    {
                        $sort : { total : -1 } 
                    },
                    { $limit: 1}
                ]).then( data => {

                    return res.status(200).json({
                        success: true,
                        data: data
                    });

                }).catch( err => {
                    return res.status(500).json({
                        success: false,
                        message: 'Server error: ' + err
                    });
                })

            } else {
                return res.status(403).json({
                    success: false,
                    message: `You don't have authorization to perform this action.` 
                });
            }

        } else {

            return res.status(404).json({
                success: false,
                message: 'The video you selected does not exist or it is inactive. Please, select one that exists and it is active.'
            });
        }


    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + err
        });
    }

});

// router.route('/statistics/emotions-in-video/2').get(verifyToken, async(req, res) => {

//   const {
//     videoId,
//     // emotions is an array with the id of the emotions the user selected
//     emotions,
//   } = req.body;

//   View.find({'videoID': videoId})
//   .then( async (items) => {
 
//     try {

//       // Get the values of the column "time" so later we can group them accroding to this
//       timeValues = await View.distinct("time", {'videoID': videoId});
//       // We will save here the emotions with their embeddings...
//       emotionValues = [];
//       // We will save the results we will send here
//       queryResultValues = [];

//       // We must turn the Strings to ObjectsId so Mongo can recognize them
//       emotionIds = emotions.map(emotion => {
//         return mongoose.Types.ObjectId(emotion)
//       })

//       // Find the emotions the user selected and check if they exist so we can proceed...
//       const emotionsFound = await Emotion.find({"_id": {"$in": emotionIds}});

//       if((Boolean(emotionsFound) && Boolean(emotions)) && (emotionsFound.length == emotions.length)){

//         // Once we checked the emotions exists, we must validate that all of them are active...
//         const emotionsInactive = emotionsFound.filter( emotion => !emotion.active);
        
//         if(!Boolean(emotionsInactive) || (Boolean(emotionsInactive) && emotionsInactive.length==0)){

//           // Get all the embeddings that belong to every emotion the user selected.
//           for(const emotion of emotionsFound){

//             const embeddings = await Embedding.find({emotionID: emotion._id});
//             emotionValues.push({
//               _id: emotion._id,
//               name: emotion.name,
//               embeddings: embeddings.map( emb => emb.embedding)
//             })

//           }

//           // We will save views by time. 
//           // Every object here has the time and an array with the views that has info about that if it belongs to one emotion.
//           viewsByTime = []
//           timeValues.map( async(time) => {

//             // For every "time" value we have, we get the views
//             viewsSelected = items.filter( item => item.time == time);
//             explicitViews = []
//             timeObject = {
//               time: time,
//               emotionResults: []
//             };

//             viewsSelected.map( view => {

//               // console.log('VIEW IS', view._id);
//               belongsToEmotionValues = [];

//               emotionValues.map( emotion => {

//                 cont = 0;
//                 belongsToEmotion = false;

//                 while(!belongsToEmotion && cont<emotion.embeddings.length){
//                   const sim = cosinesim(emotion.embeddings[cont], view.embedding);
//                   // console.log('sim is', sim);
//                   // if(sim>0.99){
//                   if(sim>0.52){
//                     belongsToEmotion = true;
//                   }
//                   cont = cont + 1;
//                 }

//                 const viewObj = {
//                   emotion: emotion._id,
//                   belongsToEmotion: belongsToEmotion,
//                 }

//                 belongsToEmotionValues.push(viewObj)    

//               });

//               explicitViews.push(belongsToEmotionValues)

//             })

//             emotionValues.map( emotion => {

//               const viewsSelected = []

//               explicitViews.map( viewObj => {

//                 const filtered = viewObj.filter(emotionInfo => ((String(emotionInfo.emotion)==String(emotion._id) && emotionInfo.belongsToEmotion)))
//                 if(Boolean(filtered) && filtered.length>0){
//                   viewsSelected.push(filtered)
//                 }
//               })

//               timeObject.emotionResults.push({
//                 "_id": emotion._id,
//                 "name": emotion.name,
//                 "views": Number(viewsSelected.length) || 0,
//               })
//             })
//             viewsByTime.push(timeObject);
//           });

          

//           return res.status(500).json({
//             success: true,
//             message: '',
//             data: viewsByTime
//           });

//         } else {

//           let text = '';
//           emotionsInactive.map( (emotion, index) => {
//             if(index!=emotionsInactive.length-1){
//               text = text + emotion.name + ', '
//             }else{
//               text = text + emotion.name
//             }
//           })
//           return res.status(403).json({
//             success: false,
//             message: `This/these emotion/s is/are inactive: ${text}. You can not select any inactive amotions.`,
//           });

//         }

//       } else {
//         return res.status(404).json({
//           success: false,
//           message: `One (or more) of the emotions you selected does not exist. Please, select at least one of them (it has to be an active one).`,
//         });
//       }

//     } catch (err) {
//       return res.status(500).json({
//         success: false,
//         message: 'Server error: ' + err
//       });
//     }
//   })
//   .catch( err => {
//     return res.status(500).json({
//       success: false,
//       message: 'Server error: ' + err
//     });
//   })
// });

// router.route('/statistics/emotions-in-video/3').get(verifyToken, async(req, res) => {

//   const {
//     videoID,
//     // emotions is an array with the id of the emotions the user selected
//     emotions,
//   } = req.body;

//   // We must turn the Strings to ObjectsId so Mongo can recognize them
//   emotionIds = emotions.map(emotion => {
//     return mongoose.Types.ObjectId(emotion)
//   })

//   // Find the emotions the user selected and check if they exist so we can proceed...

//   // const emotionsFound = await Emotion.find({"_id": {"$in": emotionIds}});

//   const emotionsFound = await Emotion.aggregate([
//     {$match: {_id: {"$in": emotionIds}}},
//     {
//       $lookup: {
//         from: "embeddings",
//         localField: "_id",
//         foreignField: "emotionID",
//         as: "embeddings",
//       }
//     }
//   ]);

//   if((Boolean(emotionsFound) && Boolean(emotions)) && (emotionsFound.length == emotions.length)){

//     // Once we checked the emotions exists, we must validate that all of them are active...
//     const emotionsInactive = emotionsFound.filter( emotion => !emotion.active);
        
//     if(!Boolean(emotionsInactive) || (Boolean(emotionsInactive) && emotionsInactive.length==0)){

//       View.aggregate([
//         { $match: {videoID: mongoose.Types.ObjectId(videoID)}},
//         { $addFields: {
//           belongsToEmotions: {
//             $function: {
//               body: function(embedding) {

//                 const belongsToEmotion = [];

//                 emotionsFound.map(emotion => {

//                   const cont = 0;
//                   let belongs = false;

//                   while(!belongs && cont < emotion.embeddings.length){

//                     const sim = cosinesim(emotion.embeddings[cont].embedding, embedding);
//                     // console.log('sim is', sim);
//                     // if(sim>0.99){
//                     if(sim>0.52){
//                       belongs = true;
//                     }
//                     cont = cont + 1
//                   }

//                   if(belongs){
//                     belongsToEmotion.push(emotion._id)
//                   }
//                 });

//                 return belongsToEmotion;
//               },
//               args: [ "$embedding" ],
//               lang: "js"
//             }
//           }
//         }}
//       ]).then( data => {
//         return res.status(200).json({
//           success: true,
//           data: data
//         });
//       })
//       .catch( err => {
//         return res.status(500).json({
//           success: false,
//           message: 'Server error: ' + err
//         });
//       })

//     } else {

//       let text = '';
//       emotionsInactive.map( (emotion, index) => {
//         if(index!=emotionsInactive.length-1){
//           text = text + emotion.name + ', '
//         }else{
//           text = text + emotion.name
//         }
//       })
//       return res.status(403).json({
//         success: false,
//         message: `This/these emotion/s is/are inactive: ${text}. You can not select any inactive amotions.`,
//       });

//     }

//   } else {
//     return res.status(404).json({
//       success: false,
//       message: `One (or more) of the emotions you selected does not exist. Please, select at least one of them (it has to be an active one).`,
//     });
//   }

// });

module.exports = router;