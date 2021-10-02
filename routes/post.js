var express = require("express");
var router = express.Router();

const userHelpers = require("../helpers/userHelpers");
const jwtVerify = require("../Middlewares/tokenVerify");
const awsS3 = require("../services/video-upload");


router.post("/setProfilePic", awsS3.videoUpload);

router.get("/explorePosts/:id", (req, res) => {

  console.log("entered");
  userHelpers.getAllPosts(req.params.id).then((result) => {
    res.json(result);
  });
});
router.get("/myPosts", jwtVerify, (req, res) => {
  let id = req.user._id;
  userHelpers.getMyPosts(id).then((result) => {
    res.json(result);
  });
});
router.put("/like/:id", (req, res) => {
  try {
    userHelpers.likePost(req.body.userId, req.params.id).then((result) => {
      if (result == "disliked") {
        res.status(200).json("The like for this post is removed");
      } else {
        res.status(200).json("The post has been liked");
      }
    });
  } catch (err) {
    res.json(err);
  }
});
router.put("/comment/:id", (req, res) => {
  try {
    userHelpers.commentPost(req.body, req.params.id).then((comment) => {
      res.status(200).json(comment);
    });
  } catch (err) {
    res.json(err);
  }
});
router.get("/userPosts/:id", (req, res) => {
  userHelpers.getMyPosts(req.params.id).then((result) => {
    res.json(result);
  });
});
router.put("/countViews/:id", (req, res) => {
  userHelpers.countView(req.params.id).then(() => {

    res.json("added");
  });
});
router.get("/searchPost/:searchKey", (req, res) => {
  userHelpers.searchPost(req.params.searchKey).then((data) => {

    res.json(data);
  });
});
router.put("/deletePost/:id", (req, res) => {
  userHelpers.deletePost(req.params.id,req.body.url).then(() => {

    res.json(true);
  });
});
router.get("/getPost/:id", (req, res) => {
  userHelpers.getPost(req.params.id).then((data) => {
    res.json(data);
  });
});
router.post("/editPost/:id",(req,res)=>{
  console.log('sameeh')
  userHelpers.editPost(req.params.id,req.body).then(() => {
    res.status(200).json(true)
  })
})
router.get("/getValuationPosts", (req, res) => {
  userHelpers.getValuationPosts().then((result) => {
    res.json(result);
  });
});


module.exports = router;
