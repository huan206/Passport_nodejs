 const nodeMailer = require('nodemailer');

 const adminEmail = 'tojiro206@gmail.com'
 const adminPassword = 'Aldan2001'
 const mailHost = 'smtp.gmail.com'
 const mailPort = 587
 
 const sendMail = (email, code) => {
   const transporter = nodeMailer.createTransport({
     host: mailHost,
     port: mailPort,
     secure: false, 
     auth: {
       user: adminEmail,
       pass: adminPassword
     }
   })
 
   const options = {
     from: adminEmail,
     to: email, 
     subject: "Email verify your account",
     html: "<h1>Welcome</h1><p>This is code for verify: "+ code +" </p>"  
   }
   console.log("sended");
   // hàm transporter.sendMail() này sẽ trả về cho chúng ta một Promise
   return transporter.sendMail(options)
 }
 
 module.exports = {
   sendMail: sendMail
 }