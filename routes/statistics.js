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
router.route('/emotions-in-video').post(verifyToken, async(req, res) => {

    const {
        videoID,
      // emotions is an array with the id of the emotions the user selected
        emotions,
    } = req.body

    if(Boolean(emotions) && Boolean(videoID) && emotions.length>0){
  
        View.find({'videoID': videoID})
        .then( async (items) => {
    
            try {
        
                // Get the values of the column "time" so later we can group them accroding to this
                // timeValues = await View.distinct("time", {'videoID': mongoose.Types.ObjectId(videoID)});
                timeValues = await View.distinct("time", {'videoID': videoID});
        
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
                                if(sim>Number(process.env.COS_SIM_CONSTANT)){
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
                            message: `Esta/s emoción/es están inactivas: ${text}. No se puede seleccionar ninguna emoción inactiva.`,
                        });
            
                    }
        
                } else {
                return res.status(404).json({
                    success: false,
                    message: `Una o más emociones de las que seleccionaste no existen. Por favor, selecciona al menos una que exista y esté activa.`,
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
    } else {
        return res.status(500).json({
            success: false,
            message: 'Por favor, selecciona un video y emociones para poder realizar el análisis...'
        });
    }
});

// This is a query that returns how many people of each country has watched the video
// They are sorted (descending), which means that the first country is the one that has more views
router.route('/country/:videoID').get(verifyToken, async(req, res) => {

    const {
        videoID,
    } = req.params;

    try {

        // Check if the video exist and if it is active
        const videoFound = await Video.findById(videoID);

        if( videoFound && videoFound.active){

            if(String(videoFound.companyID) == String(req.payload.sub)){

                // We only need to count the countries in one of the timeValues we have
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
                return res.status(401).json({
                    success: false,
                    message: `No tienes autorización para realizar esta acción.`
                });
            }

        } else {

            return res.status(404).json({
                success: false,
                message: 'El video que seleccionaste no existe o está inactivo. Por favor, selecciona uno que exista y que esté activo.'
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
router.route('/gender/:videoID').get(verifyToken, async(req, res) => {

    const {
        videoID,
    } = req.params;

    try {

        // Check if the video exist and if it is active
        const videoFound = await Video.findById(videoID);

        if( videoFound && videoFound.active){

            if(String(videoFound.companyID) == String(req.payload.sub)){

                // We only need to count the genders in one of the timeValues we have
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
                return res.status(401).json({
                    success: false,
                    message: `No tienes autorización para realizar esta acción.`
                });
            }

        } else {

            return res.status(404).json({
                success: false,
                message: 'El video que seleccionaste no existe o está inactivo. Por favor, selecciona uno que exista y que esté activo.'
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
router.route('/age/:videoID').get(verifyToken, async(req, res) => {

    const {
        videoID,
    } = req.params;

    try {

        // Check if the video exist and if it is active
        const videoFound = await Video.findById(videoID);

        if( videoFound && videoFound.active){

            if(String(videoFound.companyID) == String(req.payload.sub)){

                // We only need to count the age ranges in one of the timeValues we have
                timeValues = await View.distinct("time", {'videoID': videoID});

                View.aggregate([
                    {
                        $match: {$and: [{videoID: mongoose.Types.ObjectId(videoID)}, {time: timeValues[1]}]}
                    },
                    {
                        $project: {    
                            "ageRange": {
                                $concat: [
                                    { $cond: [{$lt: ["$age",0]}, "Desconocido", ""]}, 
                                    { $cond: [{$and:[ {$gte:["$age", 0 ]}, {$lt: ["$age", 12]}]}, "Niños", ""] },
                                    { $cond: [{$and:[ {$gte:["$age",12]}, {$lte:["$age", 21]}]}, "Adolescentes", ""]},
                                    { $cond: [{$and:[ {$gt:["$age",21]}, {$lt:["$age", 60]}]}, "Adultos", ""]},
                                    { $cond: [{$gte:["$age",60]}, "3era Edad", ""]}
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
                return res.status(401).json({
                    success: false,
                    message: `No tienes autorización para realizar esta acción.`
                });
            }

        } else {

            return res.status(404).json({
                success: false,
                message: 'El video que seleccionaste no existe o está inactivo. Por favor, selecciona uno que exista y que esté activo.'
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
router.route('/top-results/country/:videoID').get(verifyToken, async(req, res) => {

    const {
        videoID,
    } = req.params;

    try {

        // Check if the video exist and if it is active
        const videoFound = await Video.findById(videoID);

        if( videoFound && videoFound.active){

            if(String(videoFound.companyID) == String(req.payload.sub)){

                // We only need to count the countries in one of the timeValues we have
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
                return res.status(401).json({
                    success: false,
                    message: `No tienes autorización para realizar esta acción.`
                });
            }

        } else {

            return res.status(404).json({
                success: false,
                message: 'El video que seleccionaste no existe o está inactivo. Por favor, selecciona uno que exista y que esté activo.'
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
router.route('/top-results/age/:videoID').get(verifyToken, async(req, res) => {

    const {
        videoID,
    } = req.params;

    try {

        // Check if the video exist and if it is active
        const videoFound = await Video.findById(videoID);

        if( videoFound && videoFound.active){

            if(String(videoFound.companyID) == String(req.payload.sub)){

                // We only need to count the age ranges in one of the timeValues we have
                timeValues = await View.distinct("time", {'videoID': videoID});

                View.aggregate([
                    {
                        $match: {$and: [{videoID: mongoose.Types.ObjectId(videoID)}, {time: timeValues[1]}]}
                    },
                    {
                        $project: {    
                            "ageRange": {
                                $concat: [
                                    { $cond: [{$lt: ["$age",0]}, "Desconocido", ""]}, 
                                    { $cond: [{$and:[ {$gte:["$age", 0 ]}, {$lt: ["$age", 12]}]}, "Niños", ""] },
                                    { $cond: [{$and:[ {$gte:["$age",12]}, {$lte:["$age", 21]}]}, "Adolescentes", ""]},
                                    { $cond: [{$and:[ {$gt:["$age",21]}, {$lt:["$age", 60]}]}, "Adultos", ""]},
                                    { $cond: [{$gte:["$age",60]}, "3era edad", ""]}
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
                return res.status(401).json({
                    success: false,
                    message: `No tienes autorización para realizar esta acción.` 
                });
            }

        } else {

            return res.status(404).json({
                success: false,
                message: 'El video que seleccionaste no existe o está inactivo. Por favor, selecciona uno que exista y que esté activo.'
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
router.route('/top-results/gender/:videoID').get(verifyToken, async(req, res) => {

    const {
        videoID,
    } = req.params;

    try {

        // Check if the video exist and if it is active
        const videoFound = await Video.findById(videoID);

        if( videoFound && videoFound.active){

            if(String(videoFound.companyID) == String(req.payload.sub)){

                // We only need to count the genders in one of the timeValues we have
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
                return res.status(401).json({
                    success: false,
                    message: `No tienes autorización para realizar esta acción.` 
                });
            }

        } else {

            return res.status(404).json({
                success: false,
                message: 'El video que seleccionaste no existe o está inactivo. Por favor, selecciona uno que exista y que esté activo.'
            });
        }


    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + err
        });
    }

});

// Query that returns how many views the video has
router.route('/total-views/:videoID').get(verifyToken, async(req, res) => {

    const {
        videoID,
    } = req.params;

    try {

        // Check if the video exist and if it is active
        const videoFound = await Video.findById(videoID);

        if( videoFound && videoFound.active){

            if(String(videoFound.companyID) == String(req.payload.sub)){

                // We only need to count the views in one of the timeValues we have
                timeValues = await View.distinct("time", {'videoID': videoID});

                View.find({$and: [{'videoID': mongoose.Types.ObjectId(videoID)}, {'time': timeValues[1]}]}).count()
                .then( data => {

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
                return res.status(401).json({
                    success: false,
                    message: `No tienes autorización para realizar esta acción.` 
                });
            }

        } else {

            return res.status(404).json({
                success: false,
                message: 'El video que seleccionaste no existe o está inactivo. Por favor, selecciona uno que exista y que esté activo.'
            });
        }


    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + err
        });
    }
});

// This is one of the most important queries, where we get information about people's attention levels during the video
// people/time 
router.route('/attention-in-video/:videoID').get(verifyToken, async(req, res) => {

    const {
        videoID,
    } = req.params;

    try {

        // Check if the video exist and if it is active
        const videoFound = await Video.findById(videoID);

        if( videoFound && videoFound.active){

            if(String(videoFound.companyID) == String(req.payload.sub)){

                // Have the distinc time values we have in our views will help us to fill our data when we have 0 in one of the cases
                timeValues = await View.distinct("time", {'videoID': videoID});

                // Get all the views that are paying attention, and then group them by time
                attentionValues = await View.aggregate([
                    { $match : {$and: [{'videoID': mongoose.Types.ObjectId(videoID)}, {'attention': true}] }},
                    {
                        $group: { 
                            _id: "$time",
                            total: { $sum: 1 } 
                        }
                    },
                ]);

                // Get all the views that are NOT paying attention, and then group them by time
                notAttentionValues = await View.aggregate([
                    { $match : {$and: [{'videoID': mongoose.Types.ObjectId(videoID)}, {'attention': false}] }},
                    {
                        $group: { 
                            _id: "$time",
                            total: { $sum: 1 } 
                        }
                    },
                ]);

                // Once we have all of the data, we fill our blank spaces...
                // (If we don't have any view that is paying attention at a particular time, that won't pull in, so we must pull it manually)
                timeValues.map( time => {

                    attentionAtThisTime = attentionValues.filter( attentionValue => attentionValue._id == time);

                    if (attentionAtThisTime.length==0) {
                        attentionValues.push({
                            "_id": time,
                            "total": 0
                        })
                    }

                    notAttentionAtThisTime = notAttentionValues.filter( attentionValue => attentionValue._id == time);
                    if (notAttentionAtThisTime.length==0) {
                        notAttentionValues.push({
                            "_id": time,
                            "total": 0
                        })
                    }
                })


                // We return the values sorted by the time...
                return res.status(200).json({
                    success: true,
                    data: {
                        attentionValues: attentionValues.sort( (a,b) => {
                            if (a._id > b._id) {
                                return 1;
                            }
                            if (a._id < b._id) {
                                return -1;
                            }
                            return 0;
                        }),
                        notAttentionValues: notAttentionValues.sort((a,b) => {
                            if (a._id > b._id) {
                                return 1;
                            }
                            if (a._id < b._id) {
                                return -1;
                            }
                            return 0;
                        })
                    }
                });

            } else {
                return res.status(401).json({
                    success: false,
                    message: `No tienes autorización para realizar esta acción.`
                });
            }

        } else {

            return res.status(404).json({
                success: false,
                message: 'El video que seleccionaste no existe o está inactivo. Por favor, selecciona uno que exista y que esté activo.'
            });
        }


    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + err
        });
    }

        // View.aggregate([
        //     { $match : {'videoID': mongoose.Types.ObjectId(videoID)}},
        //     {
        //         $group: { 
        //             _id: { time: "$time", attention: "$attention"}, 
        //             // total: { $sum: { $cond: [ { $eq: [ "$attention", !"$attention" ] }, 0, 1 ] } }
        //             total: { $sum: 1 } 
        //         }
        //     },
        // ])
        // .then( data => {

        //     auxArray = data.filter( attentionValue => !attentionValue._id.attention)
        //     auxArray2 = data.filter( attentionValue => attentionValue._id.attention)

        //     timeValues.map( time => {

        //         // console.log('time is', time);
        //         attention = auxArray2.filter( attentionValue => attentionValue._id.time == time);
        //         if (attention.length==0) {
        //             data.push({
        //                 "_id": {
        //                     "time": time,
        //                     "attention": true
        //                 },
        //                 "total": 0
        //             })
        //         }

        //         // console.log('attention', attention);

        //         notAttention = auxArray.filter( attentionValue => attentionValue._id.time == time);
        //         if (notAttention.length==0) {
        //             data.push({
        //                 "_id": {
        //                     "time": time,
        //                     "attention": false
        //                 },
        //                 "total": 0
        //             })
        //         }
        //         // console.log('not attention', notAttention);
        //     })

        //     return res.status(200).json({
        //         success: true,
        //         data: data
        //     });
        // })
        // .catch( err => {
        //     return res.status(500).json({
        //         success: false,
        //         message: 'Server error: ' + err
        //     });
        // })
    
  
});

// What percentage of the people is paying attention
router.route('/paying-attention/:videoID').get(verifyToken, async(req, res) => {

    const {
        videoID,
    } = req.params;

    try {

        // Check if the video exist and if it is active
        const videoFound = await Video.findById(videoID);

        if( videoFound && videoFound.active){

            if(String(videoFound.companyID) == String(req.payload.sub)){

                payingAttention = await View.find({$and: [{'videoID': mongoose.Types.ObjectId(videoID)}, {'attention': true}]}).count()
                totalViews = await View.find({'videoID': mongoose.Types.ObjectId(videoID)}).count()

                if(totalViews>0){

                    let value = (payingAttention/totalViews)*100
                    value = value.toFixed(0)

                    return res.status(200).json({
                        success: true,
                        data: {
                            value: value,
                            unit: '%',
                            message: 'están prestando atención'
                        } 
                    });

                }else{
                    return res.status(200).json({
                        success: true,
                        data: {
                            value: 'Nadie',
                            unit: '',
                            message: 'está prestando atención'
                        } 
                    });
                }

            } else {
                return res.status(401).json({
                    success: false,
                    message: `No tienes autorización para realizar esta acción.` 
                });
            }

        } else {

            return res.status(404).json({
                success: false,
                message: 'El video que seleccionaste no existe o está inactivo. Por favor, selecciona uno que exista y que esté activo.'
            });
        }


    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + err
        });
    }
});

// What emotion is our predominant one
router.route('/predominant-emotion').post(verifyToken, async(req, res) => {

    const {
        videoID,
      // emotions is an array with the id of the emotions the user selected
        emotions,
    } = req.body;

    console.log(emotions)

    if(Boolean(emotions) && Boolean(videoID) && emotions.length>0){
  
        View.find({'videoID': videoID})
        .then( async (items) => {
    
            try {
        
                // We must turn the Strings to ObjectsId so Mongo can recognize them
                emotionIds = emotions.map(emotion => {
                    return mongoose.Types.ObjectId(emotion)
                })
        
                // Find the emotions the user selected and check if they exist so we can proceed...
                const emotionsFound = await Emotion.aggregate([
                    { $match: {_id: {"$in": emotionIds}} },
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
                    const emotionsInactive = emotionsFound.filter(emotion => !emotion.active);
                    
                    if(!Boolean(emotionsInactive) || (Boolean(emotionsInactive) && emotionsInactive.length==0)){
            
                        const viewsValues = [];

                        items.map( view => {

                            belongsToEmotionValues = [];
            
                            emotionsFound.map( emotion => {
            
                                cont = 0;
                                belongsToEmotion = false;
                
                                while(!belongsToEmotion && cont<emotion.embeddings.length){
                
                                    const sim = cosinesim(emotion.embeddings[cont].embedding, view.embedding);
                                    if(sim>Number(process.env.COS_SIM_CONSTANT)){
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

                            viewsValues.push(belongsToEmotionValues)

                        })


                        const finalResults = [];

                        emotionsFound.map( emotion => {

                            let cont = 0
                            viewsValues.map( view => {
                                belongs = view.filter( emotionInfo => (String(emotionInfo.emotion)==String(emotion._id)) && (emotionInfo.belongsToEmotion))
                                if(belongs.length>0){
                                    cont ++;
                                }
                            })

                            finalResults.push({
                                _id: emotion._id,
                                name: emotion.name,
                                count: cont
                            });

                        })
                        
                        const predominantEmotion = finalResults.sort( (a,b) => {
                            if (a.count < b.count) {
                                return 1;
                            }
                            if (a.count > b.count) {
                                return -1;
                            }
                            return 0;
                        })[0]

                        return res.status(200).json({
                            success: true,
                            // data: finalResults
                            data: predominantEmotion
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
                            message: `Esta/s emoción/es están inactivas: ${text}. No se puede seleccionar ninguna emoción inactiva.`,
                        });
            
                    }
        
                } else {
                    return res.status(404).json({
                        success: false,
                        message: `Una o más emociones de las que seleccionaste no existen. Por favor, selecciona al menos una que exista y esté activa.`,
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
    } else {
        return res.status(500).json({
            success: false,
            message: 'Por favor, selecciona un video y emociones para poder realizar el análisis...'
        });
    }
});

// This is one of our main queries. We can know which emotions are present in a photo
// people/time (each emotion)
router.route('/emotions-in-photo').post(verifyToken, async(req, res) => {

    const {
      // emotions is an array with the id of the emotions the user selected
        emotions,
        photo_embedding,
    } = req.body

    // console.log('holax', photo_embedding.length);

    if(Boolean(emotions) && Boolean(photo_embedding) && emotions.length>0 && photo_embedding.length>0){

        try{

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

            const queryAnswer = []

            emotionsFound.map( emotion => {

                let belongsToEmotion=false;
                let cont = 0;
                let sim = 0;

                console.log('emotion is ', emotion.name);
                while(!belongsToEmotion && cont<emotion.embeddings.length){

                    const newSim = cosinesim(emotion.embeddings[cont].embedding, photo_embedding);
                    if(newSim>Number(process.env.COS_SIM_CONSTANT)){
                        belongsToEmotion = true;
                    }
                    if(newSim>sim){
                        sim = newSim;
                    }
                    console.log('sim is', newSim);
                    cont++
                }

                queryAnswer.push({
                    'name': emotion.name,
                    '_id': emotion._id,
                    'sim': sim,
                    'belongsToEmotion': belongsToEmotion
                })
            });
    
            return res.status(200).json({
                success: true,
                data: queryAnswer
            });

        } catch (err) {

            return res.status(500).json({
                success: false,
                message: 'Server error. Error: ' + err
            });
        }
        
    } else {
        return res.status(403).json({
            success: false,
            message: 'Por favor, selecciona una foto y emociones para poder realizar el análisis...'
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