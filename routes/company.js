const router = require('express').Router();
const e = require('express');
let Company = require('../models/company.model');

// get all the companies
router.route('/').get((req, res) => {

    Company.find()
    .then(companies => {
      res.status.apply(200).json({
        success: true,
        data: companies
      })
    })
    .catch(err => {
      res.status(500).json({
        success: false,
        message: 'Server error: ' + err
      })
    });

});

// add a new company
router.route('/add').post((req, res) => {

  // Check if email already exist.
  Company.findOne({email:req.body.email}, (err, item) => {

    if(err){

      res.status(500).json({
        success: false,
        message: 'Server error: ' + err
      });

    } else {

      if(Boolean(item)){

        res.status(400).json({
          success: false,
          message: 'This email already exists.'
        });

      } else {

        // Check if company name already exist
        Company.findOne({full_name: req.body.full_name}, (err2, item2) => {

          if(err2){

            res.status(500).json({
              success: false,
              message: 'Server error: ' + err2
            });

          } else {

            if(Boolean(item2)){

              res.status(400).json({
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
            
              // when we add a company, it will be activate and waiting for acceptance
              const newCompany = new Company({
                email, 
                password,
                full_name,
                active: true,
                accepted: false,
                mainImg
              });

              newCompany.save()
                .then((data) => {
                  res.status(200).json({
                    success: true,
                    data: data
                  })
                })
                .catch(err => {
                  res.status(500).json({
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

      res.status(200).json({
        success: true,
        data: item
      })

    } else{

      res.status(404).json({
        success: false,
        message: 'This company is not registered'
      })

    }
  })
  .catch(err => {
    
    res.status(500).json({
      success: false,
      message: 'Server error: ' + err
    })
  
  });
  
});

// delete a specific company
router.route('/:id').delete((req, res) => {

  Company.deleteOne({_id: req.params.id}, (err, item) => {
    if(err){

      res.status(500).json({
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
    .then((item) => {

      if(Boolean(item)){

        const {
          email, 
          full_name,
          mainImg
        } = req.body
      
        // when we add a company, it will be activate and waiting for acceptance
        const newCompany = new Company({
          email, 
          full_name,
          active: item.active,
          accepted: item.accepted,
          password: item.password,
          mainImg
        });

        newCompany.save()
        .then((data) => {
          res.status(200).json({
            success: true,
            data: data,
            message: 'Company has been updated!'
          })
        })
        .catch(err => {
          res.status(500).json({
            success: false,
            message: 'Server error: ' + err
          })
        });

      } else {
        res.status(404).json({
          success: false,
          message: `This company is not registered, so it can't be updated.`
        });
        
      }

      
    })
    .catch(err => res.status(500).json({
      success: false,
      message: 'Server error: ' + err
    }));
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
          res.status(200).json({
            success: true,
            data: data,
            message: 'Company has been updated!'
          })
        })
        .catch(err => {
          res.status(500).json({
            success: false,
            message: 'Server error: ' + err
          })
        });

      } else {
        res.status(404).json({
          success: false,
          message: `This company is not registered, so it can't be accepted/rejected.`
        });
        
      }

      
    })
    .catch(err => res.status(500).json({
      success: false,
      message: 'Server error: ' + err
    }));
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
          res.status(200).json({
            success: true,
            data: data,
            message: 'Company has been updated!'
          })
        })
        .catch(err => {
          res.status(500).json({
            success: false,
            message: 'Server error: ' + err
          })
        });

      } else {
        res.status(404).json({
          success: false,
          message: `This company is not registered, so it can't be accepted/rejected.`
        });
        
      }

      
    })
    .catch(err => res.status(500).json({
      success: false,
      message: 'Server error: ' + err
    }));
});


module.exports = router;