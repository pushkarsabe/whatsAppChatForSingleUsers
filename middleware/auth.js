const User = require('../model/user')
const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
    try {
        const token = req.header('Authorization');
        console.log('token = ' + token);

        if (token == undefined) {
            return res.status(401).json({ message: 'User opened home page directly without login' });
        }
        const user = jwt.verify(token, process.env.JWT_SECRET);
        console.log('userid = ' + user.userid);

        User.findByPk(user.userid).then(user => {
            console.log('user object = ' + JSON.stringify(user));
            req.user = user;
            next();

        }).catch(err => console.log('err = ' + err));
    }
    catch (err) {
        console.log(err);
        req.status(401).json({ success: false });
    }
}

module.exports = {
    authenticate
};