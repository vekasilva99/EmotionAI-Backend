const router = require('express').Router();
const e = require('express');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
let Company = require('../models/company.model');
let User = require('../models/user.model');
const { LIMIT, PAGE } = require('./../utils/pagination.config')
const { verifyToken } = require('../utils/services');
const {acceptance_of_a_company, active_a_company} = require('../utils/mail_templates');

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
        data: {
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

  } else {
    return res.status(401).json({
      success: false,
      message: `You don't have authorization to perform this action.`
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
              from: `"Drinkly Team" <${process.env.MAIL_DIRECTION}>`, // sender address
              to: data.email, // list of receivers
              subject: acceptedValue?`Your company has been accepted!`:`Your company has been rejected.`, // Subject line
              text: acceptedValue?`Your company has been accepted!`:`We are extremely sorry, but your company has been rejected...`, // plain text body
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
                message: 'Company has been updated and the mail was sent!'
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
                message: `Company has been updated and but there was an error sending the email. Please, contact this company and send them an email to let them know. The error was this one: ${err}`
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
            message: `This company is not registered, so it can't be accepted/rejected.`
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
              from: `"Drinkly Team" <${process.env.MAIL_DIRECTION}>`, // sender address
              to: data.email, // list of receivers
              subject: activeValue?`Your company is active now!`:`Your company has been inactivated.`, // Subject line
              text: activeValue?`Your company is active now!`:`We are extremely sorry, but your company has been inactivated...`, // plain text body
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
                message: 'Company has been updated and the mail was sent!'
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
                message: `Company has been updated and but there was an error sending the email!. Please, contact this company and send them an email to let them know. The error was this one: ${err}`
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
            message: `This company is not registered, so it can't be activated/inactivated.`
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
        message: 'The old password is incorrect.'
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
          message: `The password has been successfully updated.`
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
      message: `You don't have authorization to perform this action.`
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
        email: item.email,
        accepted: item.accepted,
        active: item.active,
        mainImg: item.mainImg,
        full_name: item.full_name
      })
    } else {
      return res.status(404).json({
        success: false,
        message: `This company doesn't exist.`
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