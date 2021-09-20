const jwt = require('jwt-simple');
const moment = require('moment');

module.exports = {
    createToken: (user) => {
        const payload = {
            sub: user._id,
            iat: moment().unix(),
            // exp: moment().add(1, "minute").unix(),
            exp: moment().add(1, "day").unix(),
        };
        return jwt.encode(payload, process.env.TOKEN_SECRET);
    },
    verifyToken : (req, res, next) => {
        if(!req.headers['authorization']){
            return res.status(401).json({
                success: false,
                message: 'This user is not authorized to access this information.'
            })
        } else {
            const token = req.headers['authorization'].split(' ')[1]
            // Try to decode the token if it has not expired
            try{
                req.payload = jwt.decode(token, process.env.TOKEN_SECRET)
                next()
            } catch{
                return res.status(401).json({
                    success: false,
                    message: 'Your token has expired. For security reasons, you need to log in again.'
                })
            }

            
        }
    },
    cosinesim: (A,B) => {
        var dotproduct=0;
        var mA=0;
        var mB=0;
        for(i = 0; i < A.length; i++){ // here you missed the i++
            dotproduct += (A[i] * B[i]);
            mA += (A[i]*A[i]);
            mB += (B[i]*B[i]);
        }
        mA = Math.sqrt(mA);
        mB = Math.sqrt(mB);
        var similarity;
        if((mA)*(mB)!=0){
            similarity = (dotproduct)/((mA)*(mB))
        } else {
            similarity = 0;
        }
        return similarity;
    }
}