const router = require('express').Router();
const e = require('express');
let Company = require('../models/company.model');
let User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const {createToken, verifyToken} = require('../utils/services');

// log in of a company
router.post('/company', (req, res) => {

    const {
        email,
        password
    } = req.body

    Company.findOne({email: email})
    .then( async company => {

    if(Boolean(company)){

        // Validate password
        const validPassword = await bcrypt.compare(password, company.password);
        if (!validPassword) {
            return res.status(404).json({
                success: false,
                message: 'El correo electrónico o la contraseña que introdujiste son incorrectos.'
            });
        } else {
            // Check if the company has been accepted.
            if(company.accepted){
                // Check if the company is active.
                if(company.active){

                    // Create JWT a token
                    const token = createToken(company);
                    // Send a new token to the client (frontend)
                    return res.status(200).json({
                        success: true,
                        token: token,
                        data: {
                            full_name: company.full_name,
                            email: company.email,
                            active: company.active,
                            accepted: company.accepted,
                            mainImg: company.mainImg,
                            _id:company._id
                        },
                        message: 'Compañía autenticada con éxito.'
                    });

                }else{
                    return res.status(400).json({
                        success: false,
                        message: 'Esta compañía ha sido inactivada por los administradores. Ya no tienes acceso a nuestro sistema. Revisa tu correo para mayor información.'
                    });
                }
            }else{
                return res.status(400).json({
                    success: false,
                    message: 'Esta compañía todavpia no ha sido aceptada por los administradores. Te enviaremos un correo electrónico cuando esto pase.'
                });
            }
        }

    }else{
        return res.status(404).json({
            success: false,
            message: 'El correo electrónico o la contraseña que introdujiste son incorrectos.'
        })
    }
    })
    .catch( err => {
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + err
        })
    })

});

// log in of a user
router.post('/user', (req, res) => {

    const {
        email,
        password
    } = req.body

    User.findOne({email: email})
    .then( async user => {

        // Check if we found the user
        if(Boolean(user)){

            // Validate password
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(404).json({
                    success: false,
                    message: 'El correo electrónico o la contraseña que introdujiste son incorrectos.'
                });
            } else {
                // Check if the user is active.
                if(user.active){

                    // Create JWT a token
                    const token = createToken(user);
                    // Send a new token to the client (frontend)
                    return res.status(200).json({
                        success: true,
                        token: token,
                        data: {
                            _id:user._id,
                            full_name: user.full_name,
                            email: user.email,
                            active: user.active,
                            birthdate: user.birthdate,
                            country: user.country,
                            gender: user.gender,
                            isAdmin: user.isAdmin
                        },
                        message: 'Usuario autenticado con éxito.'
                    });

                }else{
                    return res.status(400).json({
                        success: false,
                        message: 'Este usuario ha sido inactivado por los administradores. Ya no tienes acceso a nuestro sistema. Revisa tu correo para mayor información.'
                    });
                }
        
            }

        }else{

            return res.status(404).json({
                success: false,
                message: 'El correo electrónico o la contraseña que introdujiste son incorrectos.'
            })

        }
    })
    .catch( err => {
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + err
        })
    })
});

module.exports = router;

