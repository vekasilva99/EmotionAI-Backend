const router = require('express').Router();
const e = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
let User = require('../models/user.model');
const { createToken, verifyToken } = require('../utils/services');
const {LIMIT, PAGE} = require('./../utils/pagination.config');
const {active_an_user} = require('../utils/mail_templates');

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
          message: 'Ya existe otro usuario registrado con este correo electrónico.'
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
                message: '¡Usuario exitosamente autenticado!.'
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
        message: 'Este usuario aún no se ha registrado.'
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
          message: 'Elemento eliminado.'
        });

      } else {

        return res.status(404).json({
          success: false,
          message: 'Este usuario aún no se ha registrado.'
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
            return res.status(403).json({
              success: false,
              message: 'Ya existe otro usuario registrado con este correo electrónico.',
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
            message: `Este usuario aún no se ha registrado, por lo que no puede ser actualizado.`
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
        message: `No tienes autorización para realizar esta acción.`
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

          const activeValue = req.params.active=='true'?true:false;
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
              active: activeValue,
            },
            {
              returnOriginal: false, 
              useFindAndModify: false 
            }
          ).then( (data) => {

            let output = active_an_user(data, activeValue);

            // create reusable transporter object using the default SMTP transport
            let transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                  user: process.env.MAIL_DIRECTION,
                  pass: process.env.MAIL_PASS,
              }
            });

            // send mail with defined transport object
            let mailOptions = {
              from: `${process.env.MAIL_TEAM} <${process.env.MAIL_DIRECTION}>`, // sender address
              to: data.email, // list of receivers
              subject: activeValue?`¡Tu cuenta ha sido activada!`:`Tu cuenta ha sido inactivada.`, // Subject line
              text: activeValue?`Tenemos buenas noticias: ¡tu cuenta ha sido activada!`:`Lamentamos mucho informarte que tu cuenta ha sido inactivada...`, // plain text body
              html: output, // html body
            }

            transporter.sendMail(mailOptions)
            .then( () => {
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
                message: '¡El usuario ha sido actualizado y se le ha enviado un correo electrónico!'
              });
            })
            .catch( err => {
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
                message: `El usuario ha sido actualizado pero hubo un error enviándole el correo electrónico. Por favor, escríbele un correo y déjales saber tu decisión. El error fue: ${err}`
              });
            });

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
            message: `Este usuario aún no se ha registrado, por lo que no puede ser activado/desactivado.`
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
        message: `No tienes autorización para realizar esta acción.`
      })

    }
});

// Change password
// Only the same user can change its own password
router.post('/changepassword/:id', verifyToken, async (req, res) => {

  const user = await User.findById(req.payload.sub)

  if(Boolean(user) && ( String(req.payload.sub) == String(req.params.id))){

    // We don't need to check if the user exists because we already checked that with the token and we have a restriction that the ids has to be the same.
    // We must check if the old password matchs...
    const {
      password,
      old_password
    } = req.body;

    // Validate password
    const validPassword = await bcrypt.compare(old_password, user.password);
    if(!validPassword){
      return res.status(403).json({
        success: false,
        message: 'La contraseña anterior es incorrecta.'
      });
    }else{
      // We proceed to update the password.
      // hasing password
      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(password, salt);

      User.findByIdAndUpdate(
        {_id: req.params.id}, 
        {
          email: user.email, 
          full_name: user.full_name,
          isAdmin: user.isAdmin,
          password: hashPassword,
          country: user.country,
          gender: user.gender,
          birthdate: user.birthdate,
          active: user.active,
        }, 
        {
          returnOriginal: false, 
          useFindAndModify: false 
        }
      ).then( data => {
        return res.status(200).json({
          success: true,
          message: `La contraseña ha sido actualizada con éxito.`
        });
      })
      .catch( err => {
        return res.status(500).json({
          success: false,
          message: 'Server error: ' + err
        });
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: `No tienes autorización para realizar esta acción.`
    });
  };
  
});

// get user info according to his/her token
router.get('/info', verifyToken, (req, res) => {

  User.findById(req.payload.sub)
  .then( user => {
    if(Boolean(user)){
      return res.status(200).json({
        success: true,
        data: {
          full_name: data.full_name,
          email: data.email,
          active: data.active,
          birthdate: data.birthdate,
          country: data.country,
          gender: data.gender,
          isAdmin: data.isAdmin
        }
      })
    } else {
      return res.status(404).json({
        success: false,
        message: 'Ese item no existe.'
      });
    };
  })
  .catch( err => {
    return res.status(500).json({
      success: false,
      message: `Server error. Error: ` + err
    });
  });
  
});


module.exports = router;