const router = require('express').Router();
const e = require('express');
let Company = require('../models/company.model');
const bcrypt = require('bcryptjs');
const LIMIT = 20;
const PAGE = 0;

// get companies
router.route('/').get((req, res) => {

  const page = parseInt(req.query.page, 10) || PAGE;
  const limit = parseInt(req.query.limit, 10) || LIMIT;
  const keyword = req.query.keyword;

  // If keyword, the filter.
  if(keyword){
    Company.paginate({"full_name": {$regex: keyword, $options: 'i'}}, {limit, page})
    .then(companies => {
      return res.status(200).json({
        success: true,
        data: companies
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
    .then(companies => {
      return res.status(200).json({
        success: true,
        data: companies
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

// add a new company
router.post('/register', (req, res) => {

  // Check if email already exist.
  Company.findOne({email:req.body.email}, (err, item) => {

    if(err){

      return res.status(500).json({
        success: false,
        message: 'Server error: ' + err
      });

    } else {

      if(Boolean(item)){

        return res.status(400).json({
          success: false,
          message: 'This email already exists.'
        });

      } else {

        // Check if company name already exist
        Company.findOne({full_name: req.body.full_name}, async (err2, item2) => {

          if(err2){

            return res.status(500).json({
              success: false,
              message: 'Server error: ' + err2
            });

          } else {

            if(Boolean(item2)){

              return res.status(400).json({
                success: false,
                message: 'This company is already registered'
              });
        
            } else {

              const {
                email, 
                password,
                full_name,
                mainImg
              } = req.body

              // hasing password
              const salt = await bcrypt.genSalt(10);
              const hashPassword = await bcrypt.hash(password, salt);
            
              // when we add a company, it will be activate and waiting for acceptance
              const newCompany = new Company({
                email, 
                password: hashPassword,
                full_name,
                active: true,
                accepted: false,
                mainImg
              });

              newCompany.save()
                .then((data) => {
                  return res.status(200).json({
                    success: true,
                    message: `The company has been successfully registered. Please, wait for the confirmation email that we'll send you when your account has been activated.`
                  })
                })
                .catch(err => {
                  return res.status(500).json({
                    success: false,
                    message: 'Server error: ' + err
                  });
                });
            }
          }
        })
        
      }


    }
  })

  
});

// get a specific company
router.route('/:id').get((req, res) => {

  Company.findById(req.params.id)
  .then(item => {

    if(Boolean(item)){

      return res.status(200).json({
        success: true,
        data: item
      })

    } else{

      return res.status(404).json({
        success: false,
        message: 'This company is not registered'
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

// delete a specific company
router.route('/:id').delete((req, res) => {

  Company.deleteOne({_id: req.params.id}, (err, item) => {
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
          message: 'Company deleted'
        });

      } else {

        return res.status(404).json({
          success: false,
          message: 'This company is not registered'
        });
      }
      
    }
  })

});

// update a specific company
// VERIFICAR QUE SEA ADMIN O LA MISMA COMPAÑIA
router.route('/update/:id').post((req, res) => {

  Company.findById(req.params.id)
    .then( async (item) => {

      if(Boolean(item)){

        const {
          email, 
          full_name,
          mainImg
        } = req.body

        // Check if there are other company with that email (apart from itself)
        const companyEmail = await Company.findOne({email: email});
        if(Boolean(companyEmail) && String(companyEmail._id)!==String(item._id)){
          return res.status(400).json({
            success: false,
            message: 'There is already another company registered with that email.',
          })
        }

        // Check if there are other company with that full_name (apart from itself)
        const companyName = await Company.findOne({full_name: full_name})
        if(Boolean(companyName) && String(companyName._id)!==String(item._id)){
          return res.status(400).json({
            success: false,
            message: 'There is already another company registered with that name.'
          })
        }

        // when we update a company, we won't change its password, accepted nor active values.
        Company.findByIdAndUpdate(
          {_id: req.params.id}, 
          {
            email, 
            full_name,
            active: item.active,
            accepted: item.accepted,
            password: item.password,
            mainImg,
  
          }, 
          {
            returnOriginal: false, 
            useFindAndModify: false 
        })
        .then((data) => {
          return res.status(200).json({
            success: true,
            data: {
              email: data.email,
              full_name: data.full_name,
              active: data.active,
              accepted: data.accepted,
              mainImg: data.mainImg,
            },
            message: 'Company has been updated!'
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
          message: `This company is not registered, so it can't be updated.`
        });
        
      }

      
    })
    .catch(err => {
      return res.status(500).json({
      success: false,
      message: 'Server error: ' + err
    })});
});

// accept or reject a specific company
// VERIFICAR QUE SEA ADMIN
router.route('/accept/:id/:accepted').post((req, res) => {

  Company.findById(req.params.id)
    .then((item) => {

      if(Boolean(item)){

        // we only change the accepted value according to what we recieved.
        const newCompany = new Company({
          email: item.email, 
          full_name: item.full_name,
          active: item.active,
          accepted: req.params.accepted,
          password: item.password,
          mainImg: item.mainImg,
        });

        newCompany.save()
        .then((data) => {
          return res.status(200).json({
            success: true,
            data: data,
            message: 'Company has been updated!'
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
          message: `This company is not registered, so it can't be accepted/rejected.`
        });
        
      }

      
    })
    .catch(err => {
      return res.status(500).json({
      success: false,
      message: 'Server error: ' + err
    })});
});

// Active/inactive a specific company
// VERIFICAR QUE SEA ADMIN
router.route('/active/:id/:active').post((req, res) => {

  Company.findById(req.params.id)
    .then((item) => {

      if(Boolean(item)){

        // we only change the active value according to what we recieved.
        const newCompany = new Company({
          email: item.email, 
          full_name: item.full_name,
          active: req.params.active,
          accepted: item.accepted,
          password: item.password,
          mainImg: item.mainImg,
        });

        newCompany.save()
        .then((data) => {
          return res.status(200).json({
            success: true,
            data: data,
            message: 'Company has been updated!'
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
          message: `This company is not registered, so it can't be accepted/rejected.`
        });
        
      }

      
    })
    .catch(err => {
      return res.status(500).json({
      success: false,
      message: 'Server error: ' + err
    })});
});


module.exports = router;