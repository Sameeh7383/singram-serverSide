const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
require('dotenv').config()
var { ObjectId, ObjectID } = require("mongodb");
const s3 = new aws.S3({
    accessKeyId: process.env.awsAccessKeyId,
    secretAccessKey:process.env.awsSecretAccessKey,
    region: 'ap-south-1',
  });

  const upload = (bucketName,fileType) =>
  // console.log(file,"sameeh")
  multer({
    storage: multerS3({
      s3,
      bucket: bucketName,
      acl: 'public-read',
      metadata: function (req, file, cb) { 
        cb(null, { fieldName: file.fieldname });
      },
      key: function (req, file, cb) {
        cb(null, `${fileType}-${Date.now()}.${fileType=="video"?"mp4":"jpeg"}`);
      },
    }),
  });
  exports.videoUpload = (req, res, next) => {
    const userHelpers = require("../helpers/userHelpers"); 
    const uploadSingle = upload("singram1","video").single(
      "file"
    )
    
    
    uploadSingle(req, res, async (err) => {
      console.log("sameeh");
      
      if (err)
        return res.status(400).json({ success: false, message: err.message });
  
    //   await User.create({ photoUrl: req.file.location });
      req.body.postedBy=ObjectId(req.body.postedBy)
      console.log(req.file.location);
      req.body.url=req.file.location
      req.body.comments=[]
      req.body.views=0
      userHelpers.addPost(req.body).then((data)=>{
        console.log(data)
      res.status(200).json(data);
      })
      
    })
   
  };
  exports.imageUpload = (req, res, next) => {
    console.log(req.params)
    const userHelpers = require("../helpers/userHelpers"); 
    const uploadSingle = upload("singram1","image").single(
      "file"
    )
    
    
    uploadSingle(req, res, async (err) => {
      console.log("sameeh");
      
      if (err)
        return res.status(400).json({ success: false, message: err.message }); 
      console.log(req.file.location) 
      console.log(req.params.id)
      userHelpers.editProfilePic(req.params.id,req.file.location).then(()=>{
        // console.log()
      res.status(200).json(true);
      })
      
    })
   
  };

  exports.DeleteObject = (fileName)=>{
    const params = {
      Bucket: "singram1",
             
      Key: fileName         
    }
      return new Promise((resolve, reject) => {
          s3.createBucket({
              Bucket: "singram1"
          }, function () {
              s3.deleteObject(params, function (err, data) {
                console.log(data)
                  if (err) 
                  reject(err)
                  else 
                  // console.log(data,"deletedddddddddd")
                  resolve(true)
              });
          });
      });
  };
