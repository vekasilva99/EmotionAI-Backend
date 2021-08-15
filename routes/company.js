const router = require('express').Router();
let Company = require('../models/company.model');

router.route('/').get((req, res) => {
    Company.find()
    .then(companies => res.json(companies))
    .catch(err => res.status(400).json('Error: ' + err));
});

router.route('/add').post((req, res) => {
  const {email, password,full_name,active,accepted,mainImg} = req.body

  const newCompany = new Company({email, password,full_name,active,accepted,mainImg});

  newCompany.save()
    .then(() => res.json('Company added!'))
    .catch(err => res.status(400).json('Error: ' + err));
});

router.route('/:id').get((req, res) => {
    Company.findById(req.params.id)
    .then(company => res.json(company))
      .catch(err => res.status(400).json('Error: ' + err));
  });

router.route('/:id').delete((req, res) => {
    Company.findById(req.params.id)
      .then(() => res.json('Company deleted.'))
      .catch(err => res.status(400).json('Error: ' + err));
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