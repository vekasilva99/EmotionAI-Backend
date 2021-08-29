const router = require('express').Router();
let User = require('../models/user.model');
const e = require('express');
const bcrypt = require('bcryptjs');
const {createToken, verifyToken} = require('../utils/services');
const {LIMIT, PAGE} = require('./../utils/pagination.config')

// get users
router.route('/').get((req, res) => {

  const page = parseInt(req.query.page, 10) || PAGE;
  const limit = parseInt(req.query.limit, 10) || LIMIT;
  const keyword = req.query.keyword;

  // If keyword, the filter.
  if(keyword){
    User.paginate({"full_name": {$regex: keyword, $options: 'i'}}, {limit, page})
    .then(users => {
      return res.status(200).json({
        success: true,
        data: users
      })
    })
    .catch(err => {
      return res.status(500).json({
        success: false,
        message: 'Server error: ' + err
      })
    })
  } else {
    User.paginate({}, {limit, page})
    .then(users => {
      return res.status(200).json({
        success: true,
        data: users
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

// add a new user
router.post('/register', (req, res) => {

  // Check if email already exist.
  User.findOne({email:req.body.email}, async (err, item) => {

    if(err){

      return res.status(500).json({
        success: false,
        message: 'Server error: ' + err
      });

    } else {

      if(Boolean(item)){

        return res.status(400).json({
          success: false,
          message: 'There is already a user registered with this email.'
        });

      } else {

        const {
          email, 
          password,
          full_name,
          birthdate,
          gender,
          country,
        } = req.body

        // hasing password
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);
      
        // when we add a User, it will be activate and waiting for acceptance
        const newUser = new User({
          email, 
          password: hashPassword,
          full_name,
          active: true,
          isAdmin: false,
          birthdate,
          gender,
          country
        });

        newUser.save()
          .then((data) => {

            // Create JWT a token
            const token = createToken(data);
            // Send a new token to the client (frontend)
            return res.status(200).json({
                success: true,
                token: token,
                data: {
                    full_name: data.full_name,
                    email: data.email,
                    active: data.active,
                    birthdate: data.birthdate,
                    country: data.country,
                    gender: data.gender,
                    isAdmin: data.isAdmin
                },
                message: 'User successfully authenticated.'
            });

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

  
});

// get a specific User
router.route('/:id').get((req, res) => {

  User.findById(req.params.id)
  .then(item => {

    if(Boolean(item)){

      return res.status(200).json({
        success: true,
        data: {
          email: item.email,
          full_name: item.full_name,
          active: item.active,
          isAdmin: item.isAdmin,
          birthdate: item.birthdate,
          gender: item.gender,
          country: item.country
        }
      })

    } else{

      return res.status(404).json({
        success: false,
        message: 'This user is not registered yet'
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

// delete a specific user (we won't use this in the web page)
router.route('/:id').delete((req, res) => {

  User.deleteOne({_id: req.params.id}, (err, item) => {
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
          message: 'The user has been deleted'
        });

      } else {

        return res.status(404).json({
          success: false,
          message: 'This user is not registered yet'
        });
      }
      
    }
  })

});

// update a specific user
// only an admin or the same user can update his/her info.
router.route('/update/:id').post( verifyToken,  async (req, res) => {

  const userToken = await User.findById(req.payload.sub);

  // Verify the token we recieve is from the same user that the one that we will update the information.
  // Or that the user that is sending the information is admin

  if( (String(req.payload.sub)==String(req.params.id)) || ( Boolean(userToken) && userToken.isAdmin) ){

    User.findById(req.params.id)
      .then( async (item) => {

        if(Boolean(item)){

          const {
            email, 
            full_name,
            country,
            gender,
            birthdate,
          } = req.body

          // Check if there are other user with that email (apart from itself)
          const UserEmail = await User.findOne({email: email});
          if(Boolean(UserEmail) && String(UserEmail._id)!==String(item._id)){
            return res.status(400).json({
              success: false,
              message: 'There is already another user registered with that email.',
            })
          }

          // when we update a User, we won't change its password, accepted nor active values.
          User.findByIdAndUpdate(
            {_id: req.params.id}, 
            {
              email, 
              full_name,
              country,
              gender,
              birthdate,
              active: item.active,
              isAdmin: item.isAdmin,
              password: item.password
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
                isAdmin: data.isAdmin,
                country: data.country,
                gender: data.gender,
                birthdate: data.birthdate
              },
              message: 'User has been updated!'
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
            message: `This user is not registered yet, so it can't be updated.`
          });
          
        }

        
      })
      .catch(err => {
        return res.status(500).json({
        success: false,
        message: 'Server error: ' + err
      })});

    } else {
      return res.status(401).json({
        success: false,
        message: `You don't have authorization to perform this action.`
      })
    }
});

// Active/inactive a specific user
// Only an admin (or the same user) can do this action.
router.route('/active/:id/:active').post( verifyToken, async (req, res) => {

  const userToken = await User.findById(req.payload.sub);

  // Verify if the user has authorization to do this.
  if( (Boolean(userToken) && userToken.isAdmin) || (String(req.params.id )== String(req.payload.sub)) ){

    User.findById(req.params.id)
      .then((item) => {

        if(Boolean(item)){

          // we only change the active value according to what we recieved.
          User.findOneAndUpdate(
            {_id: req.params.id},
            {
              email: item.email, 
              full_name: item.full_name,
              isAdmin: item.isAdmin,
              password: item.password,
              country: item.country,
              gender: item.gender,
              birthdate: item.birthdate,
              active: req.params.active,
            },
            {
              returnOriginal: false, 
              useFindAndModify: false 
            }
          ).then( (data) => {
            return res.status(200).json({
              success: true,
              data: {
                email: data.email,
                full_name: data.full_name,
                active: data.active,
                isAdmin: data.isAdmin,
                country: data.country,
                gender: data.gender,
                birthdate: data.birthdate
              },
              message: 'User has been updated!'
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
            message: `This user is not registered yet, so it can not be activated/inactivated`
          });
          
        }

        
      })
      .catch(err => {
        return res.status(500).json({
        success: false,
        message: 'Server error: ' + err
      })});

    } else {

      return res.status(401).json({
        success: false,
        message: `You don't have authorization to perform this action.`
      })

    }
});


module.exports = router;