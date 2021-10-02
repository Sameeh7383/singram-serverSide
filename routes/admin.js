var express = require("express");
var router = express.Router();
const adminHelpers = require("../helpers/AdminHelpers");
const userHelpers = require("../helpers/userHelpers");
const jwt= require('jsonwebtoken')
const {JWT_TOKEN}= require("../config/KEYS")
jwtVerify=require("../Middlewares/tokenVerify")


//  GET USER FOR USER MANAGEMENT

router.get("/getAllUsers", (req, res) => {
  adminHelpers.getAllUsers().then((data) => {
    console.log(data)
    res.json(data);
  });
});
router.put("/blockUser/:id", (req, res) => {
  adminHelpers.blockUser(req.params.id,req.body).then(() => {
    if(req.body.status == true){
      res.json("unblocked")
    }
    else{
      res.json("blocked");
    }
    
  });
});
router.get("/getAllPosts", (req, res) => {
  adminHelpers.getAllPosts().then((data) => {
    // console.log(data)
    res.json(data);
  });
});
router.put("/deletePost/:id", (req, res) => {
  console.log(req.body.url)
  adminHelpers.deletePost(req.params.id,req.body.url).then(() => {
    res.json(true);
  });
});
router.get("/getPost/:id", (req, res) => {
  adminHelpers.getPost(req.params.id).then((data) => {
    console.log(data)
    res.json(data);
  });
});
router.put("/manageJudge/:id",(req,res)=>{
  adminHelpers.updateJudge(req.params.id,req.body.judge).then(()=>{
    res.json(true)
  })
})
router.get("/getJudges", (req, res) => {
  adminHelpers.getJudges().then((data) => {
    console.log(data)
    res.json(data);
  });
});
router.get("/getDashBoard",(req, res)=>{
  console.log("dataaaaaaaaaaa")
  adminHelpers.getDashboard().then((data) => {
    res.status(200).json(data);
  })
})
router.post('/login',(req,res)=>{
  // const{email,password}=req.body
  console.log("entered")
  adminHelpers.verifyAdmin(req.body).then(async(result)=>{
    if(result=="incorrect"){
      res.status(422).json({error:"Invalid Username Or Password"})
    }
    else if(result=="notExist"){
      res.status(422).json({error:"Invalid Username Or Password"})

    }
    else{
      // jwtSecret="mnbgfdsaA"
      const jwtToken=jwt.sign({_id:result._id},JWT_TOKEN)
      res.json({jwt:jwtToken,user:result})
    }
  }).catch(err=> {console.log(err)})
})
module.exports = router;