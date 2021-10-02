var db = require("../config/connection");
// var collections = require("../config/collection");
var { ObjectId, ObjectID } = require("mongodb");
const awsS3 = require("../services/video-upload");
const { response } = require("express");
var bcrypt = require("bcrypt");
module.exports = {
  getAllUsers: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection("user")
        .find({})
        .toArray()
        .then((result) => {
          resolve(result);
        });
    });
  },
  blockUser: (id, status) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection("user")
        .updateOne({ _id: ObjectId(id) }, { $set: { status: status.status } })
        .then(() => {
          resolve();
        });
    });
  },
  getAllPosts: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection("post")
        .aggregate([
          {
            $lookup: {
              from: "user",
              localField: "postedBy",
              foreignField: "_id",
              as: "postedUser",
            },
          },
          { $unwind: "$postedUser" },
        ])
        .toArray()
        .then((result) => {
          resolve(result);
          // console.log(result)
        });
    });
  },
  deletePost: (id, url) => {
    console.log(url);
    console.log(url.substring(url.lastIndexOf("/") + 1));
    let fileName = url.substring(url.lastIndexOf("/") + 1);
    return new Promise((resolve, reject) => {
      awsS3.DeleteObject(fileName).then(() => {
        db.get()
          .collection("post")
          .updateOne({ _id: ObjectId(id) }, { $set: { url: undefined } })
          .then(() => {
            resolve();
          });
      });
    });
  },
  getPost: (id) => {
    return new Promise((resolve, reject) => {
      // db.get().collection('post').findOne({_id:ObjectId(id)}).then((data)=>{
      //   resolve(data);
      // })

      db.get()
        .collection("post")
        .aggregate([
          { $match: { _id: ObjectId(id) } },
          {
            $lookup: {
              from: "user",
              localField: "postedBy",
              foreignField: "_id",
              as: "user",
            },
          },
          { $unwind: "$user" },
        ])
        .toArray()
        .then((data) => {
          resolve(data[0]);
        });
    });
  },
  updateJudge: (id, judge) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection("user")
        .updateOne(
          { _id: ObjectId(id) },
          { $set: { judge: judge, judgedPosts: 0, payment: 0 } }
        )
        .then(() => {
          resolve();
        });
    });
  },getJudges: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection("user")
        .find({judge:true}).toArray()
        .then((result) => {
          resolve(result);
        });
    });
  },getDashboard:()=>{
    let dashboard={}
    dashboard.graphData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let year=new Date();
   
  return new Promise((resolve, reject) => {
    db.get().collection("post").aggregate([{$match:{postedAt:{ $gte: new Date(`${year.getFullYear()}`) }}},{$group: {
      _id: { $month:"$postedAt"},
      posts: { $sum: 1 },

      
    }}]).toArray().then((data) => {
      for (let i = 0; i < data.length; i++) {
        dashboard.graphData[data[i]._id - 1] = data[i].posts;
      }
      console.log(dashboard.graphData)
    })
    .then(()=>{
      db.get().collection("user").find({}).count().then((userCount)=>{
        dashboard.user=userCount
      })
    })
    .then(()=>{
      db.get().collection("user").find({status:false}).count().then((blockCount)=>{
        dashboard.block=blockCount
        
      })
    })
    .then(()=>{
      db.get().collection("user").find({judge:true}).count().then((judgeCount)=>{
      dashboard.judge=judgeCount
      
      })
    })
    .then(()=> {
      db.get().collection("post").find({}).count().then((postCount)=>{
        dashboard.post=postCount
        
      })
    })
    .then(()=>{
      db.get().collection("post").find({rating:{$ne:0}}).count().then((ratedCount)=>{
        dashboard.rated=ratedCount
        // resolve(dashboard);
      })
    })
    .then(()=>{
      db.get().collection("post").aggregate([{$group:{_id:null,totalViews:{$sum:"$views"}}}]).toArray().then((views)=>{
        dashboard.views=views[0].totalViews
        // console.log(views[0].totalViews)
        resolve(dashboard)
      })
    })
  })
  },
  verifyAdmin: (data) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection("admin")
        .findOne({ Email: data.Email })
        .then((user) => {
          if (user) {
            bcrypt.compare(data.Password, user.Password).then(async(result) => {
              if (result) {
                resolve(user);
              } else {
                resolve("incorrect"); 
              }
            });
          } else {
            resolve("notExist");
          }
        });
    });
  }
};
