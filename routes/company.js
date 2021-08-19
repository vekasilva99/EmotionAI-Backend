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
        .then(() => res.json('Company updated!'))
        .catch(err => res.status(400).json('Error: ' + err));

      } else {

        res.status(404).json({
          success: false,
          message: 'This company is not registered'
        });
        
      }

      
    })
    .catch(err => res.status(500).json({
      success: false,
      message: 'Server error: ' + err
    }));
});


module.exports = router;