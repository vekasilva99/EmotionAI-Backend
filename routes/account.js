const router = require('express').Router();
let User = require('../models/user.model');
let Company = require('../models/company.model');
const { verifyToken } = require('../utils/services');

// get user/company info according to its token
router.get('/', verifyToken, async (req, res) => {

  try{

    const user = await User.findById(req.payload.sub);
    const company = await Company.findById(req.payload.sub);

    if(Boolean(user) || Boolean(company)){
      if(Boolean(user)){
        return res.status(200).json({
          success: true,
          data: {
            _id:user._id,
            full_name: user.full_name,
            email: user.email,
            active: user.active,
            birthdate: user.birthdate,
            country: user.country,
            gender: user.gender,
            isAdmin: user.isAdmin,
            role:user.isAdmin ? "admin" : "user"
          
          }
        });
      }else{
        return res.status(200).json({
          success: true,
          data: {
            _id:company._id,
            email: company.email,
            accepted: company.accepted,
            active: company.active,
            mainImg: company.mainImg,
            full_name: company.full_name,
            role:"company"
          }
        })
      }
    } else{
      return res.status(404).json({
        success: false,
        message: `No user nor company were found.`
      });
    }
  } catch {
    return res.status(500).json({
      success: false,
      message: `Server error. Error: ` + err
    });
  }
  
  
});


module.exports = router;