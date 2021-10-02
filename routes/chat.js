var express = require("express");
var router = express.Router();
const userHelpers = require("../helpers/userHelpers");


router.post("/", (req, res) => {
    userHelpers.newChat(req.body).then((result) => {
      console.log(result);
      res.json(result);
    });
  });

router.get("/:id", (req, res) => {
    userHelpers.getChat(req.params.id).then((result) => {
      console.log(result);
      res.json(result);
    });
  });
  router.post("/message", (req, res) => {
    console.log("enter")
    userHelpers.sendMessage(req.body).then((result) => {
      console.log(result);
      res.json(result);
    });
  });
  router.get("/chatMessage/:id", (req, res) => {
    userHelpers.getChatMessage(req.params.id).then((result) => {
      console.log(result);
      res.json(result);
    });
  });
module.exports = router;
