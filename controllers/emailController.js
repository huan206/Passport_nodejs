 const mailer = require('../utils/email')

 let sendMail = async (req, res) => {
   try {
     const { email } = req.body
     await mailer.sendMail(email)
     res.send('<h3>Your email has been sent successfully.</h3>')
   } catch (error) {
     console.log(error)
     res.send(error)
   }
 }
 
 module.exports = {
   sendMail: sendMail
 }