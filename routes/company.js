const router = require('express').Router();
const e = require('express');
let Company = require('../models/company.model');

// get all the companies
router.route('/').get((req, res) => {
    Company.find()
    .then(companies => res.json(companies))
    .catch(err => res.status(400).json('Error: ' + err));
});

// add a new company
router.route('/add').post((req, res) => {

  // Check if email already exist.
  Company.findOne({email:req.body.email}, (err, item) => {
    if(err){
      res.status(500).json({
        success: false,
        error: 'Server Error ' + err
      });
    } else {
      if(Boolean(item)){
        res.status(400).json({
          success: false,
          error: 'Ese email ya existe'
        });
      } else {

        // Check if company name already exist
        Company.findOne({full_name: req.body.full_name}, (err2, item2) => {
          if(err2){
            res.status(500).json({
              success: false,
              error: 'Server Error ' + err2
            });
          } else {
            if(Boolean(item2)){
              res.status(400).json({
                success: false,
                error: 'Ese full name ya existe'
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
                .then((data) => res.json(data))
                .catch(err => {
                  res.status(500).json({
                    success: false,
                    error: 'Server Error ' + err
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
  .then(company => {
    if(Boolean(company)){
      res.json(company)
    } else{
      res.status(404).json('Company not found')
    }
  })
  .catch(err => res.status(500).json('Server error: ' + err));
  
});

// delete a specific company
router.route('/:id').delete((req, res) => {

  Company.deleteOne({_id: req.params.id}, (err, item) => {
    if(err){
      res.status(500).json({
        success: false,
        message: 'Server Error ' + err
      });
    } else {

      if(item.deletedCount==1){

        return res.json({
          success: true,
          message: 'Company deleted'
        });

      } else {
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }
      
    }
  })

});

router.route('/update/:id').post((req, res) => {
    Company.findById(req.params.id)
      .then(company => {
        company.email = req.body.email;
        company.password = req.body.password;
        company.full_name = req.body.full_name;
        company.active = req.body.active;
        company.accepted = req.body.accepted;
        company.mainImg = req.body.mainImg;
  
        company.save()
          .then(() => res.json('Company updated!'))
          .catch(err => res.status(400).json('Error: ' + err));
      })
      .catch(err => res.status(400).json('Error: ' + err));
  });
module.exports = router;