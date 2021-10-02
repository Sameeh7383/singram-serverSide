var express = require('express');
var router = express.Router();
require('dotenv').config()

const userHelpers = require("../helpers/userHelpers");
const jwt= require('jsonwebtoken')
const {JWT_TOKEN}= require("../config/KEYS")
jwtVerify=require("../Middlewares/tokenVerify")
var cors = require('cors')
const awsS3 = require("../services/video-upload");
const webpush = require('web-push')

webpush.setVapidDetails(process.env.WEB_PUSH_CONTACT, process.env.PUBLIC_VAPID_KEY, process.env.PRIVATE_VAPID_KEY)

/* GET users listing. */
router.get('/',function(req, res, next) {
  res.render('test');
});

router.post('/signUp',(req,res)=>{
 console.log("test")
    userHelpers.AddUser(req.body).then((userData)=>{
      if(userData=="exist"){
        res.status(422).json({error:"user already exists"})
      }
      else{
      req.session.user=userData
      res.json({message:"Sign Up Success!! You Can Login Now"})}
    }).catch(err=> {console.log(err)})
  

  

})

router.post('/login',(req,res)=>{
  const{email,password}=req.body
  userHelpers.verifyUser(req.body).then(async(result)=>{
    if(result=="incorrect"){
      res.status(422).json({error:"Invalid Username Or Password"})
    }
    else if(result=="notExist"){
      res.status(422).json({error:"Invalid Username Or Password"})

    }
    else{
      // res.json({message:"login success"})
      // if(req.body.subscription){
      // await userHelpers.updateSubscription(result._id,req.body.subscription)
      // }
      jwtSecret="mnbgfdsaA"
      const jwtToken=jwt.sign({_id:result._id},JWT_TOKEN)
      console.log(jwtToken)
      console.log(result)
      res.json({jwt:jwtToken,user:result})
    }
  }).catch(err=> {console.log(err)})
})
router.get('/UserProfile/:id',(req,res)=>{
userHelpers.findUser(req.params.id).then((user)=>{
  console.log(user)
  res.status(200).json(user)
})
})
router.put('/followUser/:id',(req,res)=>{
userHelpers.followUser(req.params,req.body).then((data)=>{
 res.status(200).json(data)
})
})
router.post('/updateProfile/:id',(req,res)=>{
  userHelpers.editProfile(req.params.id,req.body).then((data)=>{
   res.status(200).json(data)
  })
  })
  router.get('/SearchProfile/:searchKey',(req,res)=>{
    userHelpers.searchProfile(req.params.searchKey).then((data)=>{
      console.log(data)
      res.status(200).json(data)
    })
    })
    router.get('/getUser/:id',(req,res)=>{
      userHelpers.findUser(req.params.id).then((data)=>{
        console.log(data)
        res.status(200).json(data)
      })
      })
      router.get('/userFollowings/:id',(req,res)=>{
        console.log(req.params.id)
        userHelpers.getFollowings(req.params.id).then((data)=>{
          // console.log(data)
          res.status(200).json(data)
        })
        })
router.get('/userFollowers/:id',(req,res)=>{
          console.log(req.params.id)
          userHelpers.getFollowers(req.params.id).then((data)=>{
            // console.log(data)
            res.status(200).json(data)
          })
          })
router.post("/editProPic/:id", awsS3.imageUpload);

router.put("/deletePropic/:id",(req, res)=>{
  userHelpers.deletePropic(req.params.id,req.body.url).then(() => {
    res.json(true);
  });
})
router.post('/notifications', (req, res) => {
  console.log("sameeh")
  const subscription = req.body

 

  console.log(subscription)

  const payload = JSON.stringify({
    title: 'Hello!',
    body: 'Welcome to singram',
  })

  webpush.sendNotification(subscription, payload)
    .then(result => console.log(result))
    .catch(e => 
      console.log(e.stack)
      // console.log("sameeh")
      )

  res.status(200).json({'success': true})
});

router.put('/logout/:id',(req,res)=>{
  userHelpers.removeSubscription(req.params.id,req.body.subscription).then(()=>{
   res.status(200).json(true)
  })
  })
  router.get('/UserProfileCard/:id',(req,res)=>{
    userHelpers.userCard(req.params.id).then((user)=>{
      console.log(user)
      res.status(200).json(user)
    })
    })
module.exports = router;
