const router = require('express').Router();
const e = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
let Company = require('../models/company.model');
let User = require('../models/user.model');
let Video = require('../models/video.model');
const { LIMIT, PAGE } = require('./../utils/pagination.config')
const { verifyToken } = require('../utils/services');
const {acceptance_of_a_company, active_a_company, company_registered} = require('../utils/mail_templates');

// get companies
router.route('/').get((req, res) => {

  const page = parseInt(req.query.page, 10) || PAGE;
  const limit = parseInt(req.query.limit, 10) || LIMIT;
  const keyword = req.query.keyword;
  const onlyActive = (req.query.onlyActive && req.query.onlyActive=='true') ? true : false;
  const onlyAccepted = (req.query.onlyAccepted && req.query.onlyAccepted=='true') ? true : false;

  let query = {};

  if(keyword){
    query.full_name = {$regex: keyword, $options: 'i'}
  }
  if(onlyActive){
    query.active = true;
  }

  if(onlyAccepted){
    query.accepted = true;
  }

  Company.paginate(query, {limit, page})
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
          message: 'Ya existe una compañía con este correo electrónico.'
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
                message: 'Esta compañía ya está registrada'
              });
        
            } else {

              try {

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

                    let output = company_registered(data);

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
                      to: process.env.MAIL_DIRECTION, // list of receivers
                      subject: `¡Nueva compañía registrada!`, // Subject line
                      text: `¡Hola! Tienes una nueva solicitud de una compañía que quiere unirse a nosotros...`, // plain text body
                      html: output, // html body
                    }

                    transporter.sendMail(mailOptions)
                    .then( () => {

                      return res.status(200).json({
                        success: true,
                        message: `La compañía ha sido registrada exitosamente. Por favor, espera al correo electrónico de confirmación que te enviaremos una vez que la compañía haya sido aceptada.`,
                        data: {
                          _id: data._id,
                          email: data.email,
                          accepted: data.accepted,
                          active: data.active,
                          mainImg: data.mainImg,
                          full_name: data.full_name,
                          _id: data._id,
                        },
                        mailSent: true
                      });

                    })
                    .catch( err => {
                      return res.status(200).json({
                        success: true,
                        message: `La compañía ha sido registrada exitosamente. Por favor, espera al correo electrónico de confirmación que te enviaremos una vez que la compañía haya sido aceptada.`,
                        data: {
                          _id: data._id,
                          email: data.email,
                          accepted: data.accepted,
                          active: data.active,
                          mainImg: data.mainImg,
                          full_name: data.full_name,
                          _id: data._id,
                        },
                        mailSent: false,
                        mailMessage: 'Un error ocurrió cuando se trató de notificar a los administradores sobre el nuevo registro. El error fue: '+ err
                      });
                    })

                    

                  })
                  .catch(err => {
                    return res.status(500).json({
                      success: false,
                      message: 'Server error: ' + err
                    });
                  });
              } catch (err3){
                return res.status(500).json({
                  success: false,
                  message: 'Server error: ' + err3
                });
              }
            }
          }
        })
        
      }


    }
  })

  
});

// upload img after the company registered itself
router.route('/register/:id/upload/image').post( (req, res) => {

  Company.findById(req.params.id)
    .then( async (item) => {

      if(Boolean(item)){

        const {
          mainImg
        } = req.body

        // when we update a company, we won't change its password, accepted nor active values.
        Company.findByIdAndUpdate(
          {_id: req.params.id}, 
          {
            email: item.email, 
            full_name: item.full_name,
            active: item.active,
            accepted: item.accepted,
            password: item.password,
            mainImg,
  
          }, 
          {
            returnOriginal: false, 
            useFindAndModify: false 
          }
        )
        .then((data) => {
          return res.status(200).json({
            success: true,
            data: {
              _id:data._id,
              email: data.email,
              full_name: data.full_name,
              active: data.active,
              accepted: data.accepted,
              mainImg: data.mainImg,
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
          message: `Esta compañía no se ha registrado y, por lo tanto, no puede ser actualizada.`
        });
        
      }

      
    })
    .catch(err => {
      return res.status(500).json({
      success: false,
      message: 'Server error: ' + err
    })});

});

// get a specific company
router.route('/:id').get((req, res) => {

  Company.findById(req.params.id)
  .then(item => {

    if(Boolean(item)){

      return res.status(200).json({
        success: true,
        data: {
          _id: item._id,
          email: item.email,
          accepted: item.accepted,
          active: item.active,
          mainImg: item.mainImg,
          full_name: item.full_name
        }
      })

    } else{

      return res.status(404).json({
        success: false,
        message: `Esta compañía no se ha registrado.`
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

// delete a specific company (we won't use this in the web page)
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
          message: 'Elemento eliminado.'
        });

      } else {

        return res.status(404).json({
          success: false,
          message: `Esta compañía no se ha registrado.`
        });
      }
      
    }
  })

});

// update a specific company
// Only the same company can edit its own information (or an admin)
router.route('/update/:id').post( verifyToken, async (req, res) => {

  const userToken = await User.findById(req.payload.sub);

  if( String(req.params.id)==String(req.payload.sub) || ( Boolean(userToken) && userToken.isAdmin) ){
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
              message: 'Ya existe otra compañía registrada con este correo electrónico.',
            })
          }

          // Check if there are other company with that full_name (apart from itself)
          const companyName = await Company.findOne({full_name: full_name})
          if(Boolean(companyName) && String(companyName._id)!==String(item._id)){
            return res.status(400).json({
              success: false,
              message: 'Ya existe otra compañía registrada con este nombre'
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
            }
          )
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
            message: `Esta compañía no se ha registrado y, por lo tanto, no puede ser actualizada.`
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

// accept or reject a specific company
// Only an admin can accept/reject companies
router.route('/accept/:id/:accepted').post(verifyToken, async (req, res) => {

  const userToken = await User.findById(req.payload.sub);

  if(Boolean(userToken) && userToken.isAdmin){

    Company.findById(req.params.id)
      .then((item) => {

        if(Boolean(item)){

          const acceptedValue = req.params.accepted=='true'?true:false;
          // we only change the accepted value according to what we recieved.
          Company.findByIdAndUpdate(
            {_id: req.params.id}, 
            {
              email: item.email, 
              full_name: item.full_name,
              active: item.active,
              password: item.password,
              mainImg: item.mainImg,
              accepted: acceptedValue,
            }, 
            {
              returnOriginal: false, 
              useFindAndModify: false 
            }
          )
          .then((data) => {

            let output = acceptance_of_a_company(data, acceptedValue);

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
              subject: acceptedValue?`¡Tu compañía ha sido aceptada!`:`Tu compañía ha sido rechazada.`, // Subject line
              text: acceptedValue?`Tenemos buenas noticias: ¡tu compañía ha sido aceptada!`:`Sentimos mucho anunciarte que tu compañía ha sido rechazada...`, // plain text body
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
                  accepted: data.accepted,
                  mainImg: data.mainImg,
                },
                message: '¡La compañía ha sido actualizada y se ha enviado un correo electrónico!'
              });
            })
            .catch( err => {
              return res.status(200).json({
                success: true,
                data: {
                  email: data.email,
                  full_name: data.full_name,
                  active: data.active,
                  accepted: data.accepted,
                  mainImg: data.mainImg,
                },
                message: `La compañía ha sido actualizada pero hubo un error enviándoles el correo electrónico. Por favor, escríbeles un correo y déjales saber su decisión. El error fue: ${err}`
              });
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
            message: `Esta compañía no se ha registrado y, por lo tanto, no puede ser actualizada.`
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

// Active/inactive a specific company
// Only a company can make itself active or inactive (or an admin)
router.route('/active/:id/:active').post(verifyToken, async (req, res) => {

  const userToken = await User.findById(req.payload.sub);

  if( String(req.params.id)==String(req.payload.sub) || ( Boolean(userToken) && userToken.isAdmin) ){
    
  
    Company.findById(req.params.id)
      .then((item) => {

        if(Boolean(item)){

          const activeValue = req.params.active=='true'?true:false;
          // we only change the accepted value according to what we recieved.
          Company.findByIdAndUpdate(
            {_id: req.params.id}, 
            {
              email: item.email, 
              full_name: item.full_name,
              active: activeValue,
              password: item.password,
              mainImg: item.mainImg,
              accepted: item.accepted,
            }, 
            {
              returnOriginal: false, 
              useFindAndModify: false 
            }
          )
          .then((data) => {

            Video.updateMany(
              {"companyID": req.params.id},
              {
                $set: {
                  "active": activeValue
                }
              }
            ).then( () => {
              console.log('active videos: ', activeValue);
            })
            .catch( err => {
              console.log('Error when we tried to active/inactive videos. Error: ', err);
            })

            let output = active_a_company(data, activeValue);

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
              subject: activeValue?`¡Tu compañía ha sido activada!`:`Tu compañía ha sido inactivada.`, // Subject line
              text: activeValue?`Tenemos buenas noticias: ¡tu compañía ha sido activada!`:`Lamentamos mucho anunciarte que tu compañía ha sido inactivada`, // plain text body
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
                  accepted: data.accepted,
                  mainImg: data.mainImg,
                },
                message: '¡La compañía ha sido actualizada y se ha enviado un correo electrónico!'
              });
            })
            .catch( err => {
              return res.status(200).json({
                success: true,
                data: {
                  email: data.email,
                  full_name: data.full_name,
                  active: data.active,
                  accepted: data.accepted,
                  mainImg: data.mainImg,
                },
                message: `La compañía ha sido actualizada pero hubo un error enviándoles el correo electrónico. Por favor, escríbeles un correo y déjales saber su decisión. El error fue: ${err}`
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
            message: `Esta compañía no se ha registrado y, por lo tanto, no puede ser actualizada.`
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
      });
    }
});

// Change password
// Only the same company can change its own password
router.post('/changepassword/:id', verifyToken, async (req, res) => {

  const companyToken = await Company.findById(req.payload.sub)

  if(Boolean(companyToken) && ( String(req.payload.sub) == String(req.params.id))){

    // We don't need to check if the company exists because we already checked that with the token and we have a restriction that the ids has to be the same.
    // We must check if the old password matchs...
    const {
      password,
      old_password
    } = req.body;

    // Validate password
    const validPassword = await bcrypt.compare(old_password, companyToken.password);
    if(!validPassword){
      return res.status(404).json({
        success: false,
        message: 'La contraseña anterior es incorrecta.'
      });
    }else{
      // We proceed to update the password.
      // hasing password
      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(password, salt);

      Company.findByIdAndUpdate(
        {_id: req.params.id}, 
        {
          email: companyToken.email, 
          full_name: companyToken.full_name,
          active: companyToken.active,
          password: hashPassword,
          mainImg: companyToken.mainImg,
          accepted: companyToken.accepted,
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

// get company info according to itstoken
router.get('/info', verifyToken, (req, res) => {

  Company.findById(req.payload.sub)
  .then( company => {
    if(Boolean(company)){
      return res.status(200).json({
        success: true,
        data: {
          email: item.email,
          accepted: item.accepted,
          active: item.active,
          mainImg: item.mainImg,
          full_name: item.full_name,
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
  })
  
  
});

module.exports = router;