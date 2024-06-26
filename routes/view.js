const router = require('express').Router();
let View = require('../models/view.model');
let Company = require('../models/company.model');
let User = require('../models/user.model');
const { LIMIT, PAGE } = require('./../utils/pagination.config');
const { verifyToken } = require('../utils/services');
const mongoose = require('mongoose');

// get views
// only admins and companies can access to this information
router.route('/').get(verifyToken, async (req, res) => {

  const userToken = await User.findById(req.payload.sub);
  const companyToken = await Company.findById(req.payload.sub);
  
  try{
    if((Boolean(userToken) && userToken.isAdmin) || Boolean(companyToken) ){

      const page = parseInt(req.query.page, 10) || PAGE;
      const limit = parseInt(req.query.limit, 10) || LIMIT;
      // const keyword = req.query.keyword;
      const videoID = req.query.videoID ? mongoose.Types.ObjectId(req.query.videoID) : null

      // If videoID, the filter.
      if(videoID){
        View.paginate({"videoID": videoID}, {limit, page})
        .then(items => {
          return res.status(200).json({
            success: true,
            data: items
          })
        })
        .catch(err => {
          return res.status(500).json({
            success: false,
            message: 'Server error: ' + err
          })
        })
      } else {
        View.paginate({}, {limit, page})
        .then(items => {
          return res.status(200).json({
            success: true,
            data: items
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
        message: `No tienes autorización para realizar esta acción.`
      });

    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + err
    })
  }

});

// add view
router.route('/add').post((req, res) => {

  const {
    videoID,
    time,
    embedding,
    attention,
    age,
    gender,
    country
  } = req.body

  const newView = new View({
    videoID,
    time,
    embedding,
    attention,
    age,
    gender,
    country
  });

  newView.save()
  .then((data) => {
    return res.status(200).json({
      success: true,
      message: `El item ha sido añadido con éxito.`
    })
  })
  .catch(err => {
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + err
    });
  });

});

// add multiples views at the same time
router.route('/add-multiple').post((req, res) => {

  const views = req.body.views
  const newViews = []

  // Check if we have any views
  if(!Boolean(views) || (Boolean(views) && views.length==0)){
    return res.status(403).json({
      success: false,
      message: 'No se envió ningún item para añadir.'
    });
  } else {

    let cont = 0;
    let viewsAreCorrect = true;

    // Create object View for each view
    while(viewsAreCorrect && cont<views.length){

      let {
        videoID,
        time,
        embedding,
        attention,
        age,
        gender,
        country
      } = views[cont]

      // If view is incomplete we don't add them to the DB
      if(!Boolean(videoID) || !Boolean(time) || !Boolean(embedding) || attention==undefined || !Boolean(age) || !Boolean(country) || !Boolean(gender)){
        viewsAreCorrect = false;
      }

      let newView = new View({
        videoID,
        time,
        embedding,
        attention,
        age,
        gender,
        country
      });

      newViews.push(newView);

      cont++;
    }

    if(viewsAreCorrect){
      View.insertMany(newViews)
      .then((data) => {
        return res.status(200).json({
          success: true,
          message: `Los items han sido añadidos con éxito.`
        })
      })
      .catch(err => {
        return res.status(500).json({
          success: false,
          message: 'Server error: ' + err
        });
      });
    }else{
      return res.status(403).json({
        success: false,
        message: 'Uno o más de los campos requeridos para añadir el item falta. Cada item necesita información sobre su tiempo, video, embedding, atención, edad, género y país. '
      });
    }
  }

  

});

// get a specific view
// only admins and companies can access to this information
router.route('/:id').get(verifyToken, async (req, res) => {

  const userToken = await User.findById(req.payload.sub);
  const companyToken = await Company.findById(req.payload.sub);
  
  if((Boolean(userToken) && userToken.isAdmin) || Boolean(companyToken) ){

    View.findById(req.params.id)
    .then(item => {

      if(Boolean(item)){

        return res.status(200).json({
          success: true,
          data: item
        });

      } else {

        return res.status(404).json({
          success: false,
          message: 'Ese item no existe.'
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
      message: `No tienes autorización para realizar esta acción.`
    });
  };

});

// Delete specific emotion (we won't use this in the web page)
router.route('/:id').delete((req, res) => {

  View.deleteOne({_id: req.params.id}, (err, item) => {
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
          message: 'Item eliminado'
        });

      } else {

        return res.status(404).json({
          success: false,
          message: 'Ese item no existe.'
        });
      }
      
    }
  });

});

// get a specific view
// only admins and companies can access to this information
router.route('/update/:id').post(verifyToken, async (req, res) => {

  const userToken = await User.findById(req.payload.sub);
  const companyToken = await Company.findById(req.payload.sub);
  
  if( (Boolean(userToken) && userToken.isAdmin) || Boolean(companyToken)){

    View.findById(req.params.id)
    .then( item => {

      if(Boolean(item)){

        const {
          videoID, 
          time,
          embedding,
          attention,
          age,
          gender,
          country
        } = req.body
  
        View.findByIdAndUpdate(
          {_id: req.params.id}, 
          {
            videoID, 
            time,
            embedding,
            attention,
            age,
            gender,
            country
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
            message: '¡El elemento ha sido actualizado con éxito!'
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
          message: 'Ese item no existe.'
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
      message: `No tienes autorización para realizar esta acción.`
    });

  }
});


module.exports = router;