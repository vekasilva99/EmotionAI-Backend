const router = require('express').Router();
let User = require('../models/user.model');

router.route('/').get((req, res) => {
    User.find()
    .then(users => res.json(users))
    .catch(err => res.status(400).json('Error: ' + err));
});

router.route('/add').post((req, res) => {
  const {email, password,birthdate,gender,country,full_name,active,isAdmin} = req.body

  const newUser = new User({email, password,birthdate,gender,country,full_name,active,isAdmin});

  newUser.save()
    .then(() => res.json('User added!'))
    .catch(err => res.status(400).json('Error: ' + err));
});

router.route('/:id').get((req, res) => {
    User.findById(req.params.id)
    .then(user => res.json(user))
      .catch(err => res.status(400).json('Error: ' + err));
  });

router.route('/:id').delete((req, res) => {

  try {
    User.deleteOne({_id: req.params.id}, (err, item) => {
      if(err){
        res.json(err);
      }
      else {
        // res.json(item);
        res.json('User deleted.')
      }
    })
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
  
      return res.status(400).json({
        success: false,
        error: messages
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Server Error ' + err
      });
    }
  }

});

router.route('/update/:id').post((req, res) => {
    User.findById(req.params.id)
      .then(user => {
        user.email = req.body.email;
        user.password = req.body.password;
        user.full_name = req.body.full_name;
        user.active = req.body.active;
        user.country = req.body.country;
        user.birthdate = req.body.birthdate;
        user.gender = req.body.gender;
        user.isAdmin = req.body.isAdmin;
  
        user.save()
          .then(() => res.json('User updated!'))
          .catch(err => res.status(400).json('Error: ' + err));
      })
      .catch(err => res.status(400).json('Error: ' + err));
  });
module.exports = router;