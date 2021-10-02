var db = require("../config/connection");
var collections = require("../config/KEYS");
var bcrypt = require("bcrypt");
var { ObjectId, ObjectID } = require("mongodb");
const { response } = require("express");
const Razorpay = require("razorpay");
require('dotenv').config()
// const aws = require("aws-sdk");
const referralCodeGenerator = require("referral-code-generator");
const awsS3 = require("../services/video-upload");
const webpush = require('web-push')
webpush.setVapidDetails(process.env.WEB_PUSH_CONTACT, process.env.PUBLIC_VAPID_KEY, process.env.PRIVATE_VAPID_KEY)
const sendNotification=(id,payload)=>{
db.get().collection('user').findOne({_id: ObjectId(id)}).then((data)=>{
  if (data.subscriptions.length !=0){
    data.subscriptions.map((subscription)=>{
      webpush.sendNotification(subscription, payload)
      .then(result => console.log(result))
      .catch(e => 
        console.log(e.stack)
        // console.log("sameeh")
        )
    })
  }
})

}
module.exports = {
  AddUser: (data) => {
    return new Promise((resolve, reject) => {
      console.log(data);
      db.get()
        .collection("user")
        .findOne({
          $or: [{ Email: data.Email }, { PhoneNumber: data.PhoneNumber }],
        })
        .then(async (UserData) => {
          if (UserData) {
            resolve("exist");
          } else {
            data.Password = await bcrypt.hash(data.Password, 10);
            data.followings = [];
            data.followers = [];
            data.subscriptions=[];
            data.PasswordAgain=null
            data.judge=false
            data.status=true
            db.get()
              .collection("user")
              .insertOne(data)
              .then((result) => {
                console.log(result.ops[0]);
                resolve(result.ops[0]);
              });
          }
        });
    });
  },
  verifyUser: (data) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection("user")
        .findOne({ Email: data.Email })
        .then((user) => {
          if (user) {
            bcrypt.compare(data.Password, user.Password).then(async(result) => {
              if (result) {
                if(data.subscription){
                await db.get().collection("user").updateOne({_id:ObjectId(user._id)},{$push:{subscriptions:data.subscription}})
                }
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
  },
  findUser: (id) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection("user")
        .findOne({ _id: ObjectId(id) })
        .then((result) => {
          resolve(result);
        });
    });
  },
  addPost: (data) => {
    console.log(data);
    data.postedAt = new Date();
    data.likes = [];
    return new Promise((resolve, reject) => {
      console.log("enteredd in to promise");
      db.get()
        .collection("post")
        .insertOne(data)
        .then((data) => {
          resolve(data.ops[0]);

        });
    });
  },
  getAllPosts: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection("user")
        .findOne({ _id: ObjectId(userId) })
        .then((data) => {});
      db.get()
        .collection("user")
        .aggregate([
          { $match: { _id: ObjectId(userId) } },
          { $unwind: "$followings" },
          {
            $lookup: {
              from: "user",
              localField: "followings",
              foreignField: "_id",
              as: "user",
            },
          },
          { $unwind: "$user" },
          {
            $project: {
              _id: "$user._id",
              UserName: "$user.UserName",
              propic: "$user.propic",
            },
          },
          {
            $lookup: {
              from: "post",
              localField: "_id",
              foreignField: "postedBy",
              as: "post",
            },
          },
          { $unwind: "$post" },{$sort:{"post.postedAt":-1}}
        ])
        .toArray()
        .then((data) => {
          resolve(data);
        });
    });
  },
  getMyPosts: (userId) => {
    return new Promise((resolve, reject) => {
     console.log(userId);
      db.get().collection("user").aggregate([{$match:{_id: ObjectId(userId)}},
        {$lookup:{from:"post",localField:"_id",foreignField:"postedBy",as:"post"}},
      {$unwind:"$post"},
      {
        $project: {
          _id: "$_id",
          UserName: "$UserName",
          propic: "$propic",
          post:"$post"
        }
      },{$sort:{"post.postedAt":-1}}
    ])
    .toArray()
    .then((data)=>{
        // console.log(data)
        resolve(data)
        
      })
    });
  },
  likePost: (userId, postId) => {
    return new Promise((resolve, reject) => {
      console.log(userId, postId);
      db.get()
        .collection("post")
        .findOne({ _id: ObjectId(postId) })
        .then(async (data) => {
          let post=data
          // console.log(post.likes);
          console.log(post.likes.toString().includes((userId)))
          if (post.likes.toString().includes(ObjectId(userId))) {
            
            await db
              .get()
              .collection("post")
              .updateOne(
                { _id: ObjectId(postId) },
                { $pull: { likes:ObjectId(userId)  } }
              );
            resolve("disliked");
          } else {
            await db
              .get()
              .collection("post")
              .updateOne(
                { _id: ObjectId(postId) },
                { $push: { likes:ObjectId(userId) } }
              );
              db.get().collection('user').findOne({_id:ObjectId(userId)}).then(async(user)=>{
                await sendNotification(data.postedBy,JSON.stringify({
                  title: 'Liked your post',
                  body: `${user.UserName} liked your post`,
                  // url:"http://localhost:3000/profile/user._id"
                }))
                resolve("liked");
              })
            
          }
        });
    });
  },
  commentPost: (data, post) => {
    return new Promise((resolve, reject) => {
      let comment = {
        comments: {
          postedBy: data.user,
          comment: data.comment,
          postedAt: new Date(),
          _id: new ObjectId(),
        },
      };
      db.get()
        .collection("post")
        .updateOne({ _id: ObjectId(post) }, { $push: comment })
        .then(() => {
          resolve(comment);
        });
    });
  },
  followUser: (user, followUser) => {
    return new Promise((resolve, reject) => {
      console.log(user, followUser);
      db.get()
        .collection("user")
        .findOne({ _id: ObjectId(followUser.userId) })
        .then((result) => {
          // console.log(s)
          if (result.followings.toString().includes(ObjectId(user.id))) {
            db.get()
              .collection("user")
              .updateOne(
                { _id: ObjectId(user.id) },
                { $pull: { followers: ObjectId(followUser.userId) } }
              )
              .then(async () => {
                await db
                  .get()
                  .collection("user")
                  .updateOne(
                    { _id: ObjectId(followUser.userId) },
                    { $pull: { followings: ObjectId(user.id) } }
                  );
                resolve("Unfollowed");
              });
          } else {
                db.get()
                  .collection("user")
                  .updateOne(
                    { _id: ObjectId(user.id) },
                    { $push: { followers: ObjectId(followUser.userId) } }
                  )
                  .then(async () => {
                    await db
                      .get()
                      .collection("user")
                      .updateOne(
                        { _id: ObjectId(followUser.userId) },
                        { $push: { followings: ObjectId(user.id) } }
                      );
                    await sendNotification(user.id,JSON.stringify({
                      title: 'New Follower',
                      body: `${result.UserName} followed you`,
                    }))
                    resolve("followed");
                  });
             
          }
        });
    });
  },
  userPosts: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection("post")
        .find({ "postedBy._id": userId })
        .toArray()
        .then((posts) => {
          resolve(posts);
        });
    });
  },
  editProfile: (userId, data) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection("user")
        .updateOne({ _id: ObjectId(userId) }, { $set: data })
        .then(() => {
          db.get()
            .collection("user")
            .findOne({ _id: ObjectId(userId) })
            .then((data) => {
              resolve(data);
            });
        });
    });
  },
  countView: (postId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection("post")
        .updateOne({ _id: ObjectId(postId) }, { $inc: { views: 1 } })
        .then(() => {
          resolve();
        });
    });
  },
searchProfile:(searchKey)=>{
  return new Promise((resolve, reject) => {
db.get().collection('user').find({UserName:{$regex:searchKey,$options:"$i"}}).toArray().then((data)=>{
resolve(data)
})
})
  },
  newChat:(data)=>{
    return new Promise((resolve, reject) => {
db.get().collection('chat').insertOne({members:[ObjectId(data.sender),ObjectId(data.reciever)],createdAt:new Date()}).then((result)=>{
  resolve(result.ops[0])
})
})
  },getChat:(id)=>{
    return new Promise((resolve, reject) => {
    db.get().collection("chat").find({members:{$in:[ObjectId(id)]}}).toArray().then((data)=>{
     resolve(data)
    })
  })
  },sendMessage:(data)=>{
    data.sender=ObjectId(data.sender)
    data.time= new Date()
    data.chat=ObjectId(data.chat)
    return new Promise((resolve, reject) => {
      db.get().collection("message").insertOne(data).then((result)=>{
        db.get().collection('chat').findOne({_id:ObjectId(data.chat)}).then(async (chat)=>{
          console.log(chat.members)
          let reciever
          // =await chat.members.filter((user)=>{
          //   user.toString() !== data.sender.toString()
          // })
          await chat.members.map((user)=> 
          
          {
            
            data.sender != user ?
            reciever=user : data.time=null})
          console.log(reciever)
          await sendNotification(reciever,JSON.stringify({
            title: 'You have a new message',
            body: `${data.senderName}:${data.text}`,
          }))
          resolve(result.ops[0])
        })
     
      })
    })
  
  },getChatMessage:(id)=>{
    return new Promise((resolve, reject) => {
      // db.get().collection("message").find({chat:ObjectId(id)}).toArray().then((data)=>{
      // resolve(data)
      // })
db.get().collection("message").aggregate([{$match:{chat:ObjectId(id)}},{$lookup:{from:"user",localField:"sender",foreignField:"_id",as:"senderData"}},{$unwind:"$senderData"}]).toArray().then((data)=>{
  resolve(data)
})
    })
    

  },getFollowings:(userId)=>{
    
    return new Promise((resolve, reject) => {
    db.get().collection("user").aggregate([{$match: { _id: ObjectId(userId) }},
      {$unwind:"$followings"}
      ,{$lookup:{from:"user",localField:"followings",foreignField:"_id",as:"friends"}},{$unwind:"$friends"},
      {$project:{friends:"$friends",_id:0}}
      ]).toArray().then((result)=>{
        resolve(result)
    })
  })
  },getFollowers:(userId)=>{   
    return new Promise((resolve, reject) => {
    db.get().collection("user").aggregate([{$match: { _id: ObjectId(userId) }},
      {$unwind:"$followers"}
      ,{$lookup:{from:"user",localField:"followers",foreignField:"_id",as:"friends"}},{$unwind:"$friends"},
      {$project:{friends:"$friends",_id:0}}
      ]).toArray().then((result)=>{
        resolve(result)
    })
  })
  },searchPost:(searchKey)=>{
    return new Promise((resolve, reject) => {
//       db.get().collection("post").find({$or:[{name:{$regex:searchKey,$options:"$i"}},{sources:{$regex:searchKey,$options:"$i"}},{category:{$regex:searchKey,$options:"$i"}},{description:{$regex:searchKey,$options:"$i"}}]}).toArray().then((data)=>{
//         console.log(data);
// resolve(data)
//       })
db.get().collection("post").aggregate([{$match:{name:{$regex:searchKey,$options:"$i"}}}
,{$lookup:{from:"user",localField:"postedBy",foreignField:"_id",as:"postedUser"}},{$unwind:"$postedUser"}
]).toArray().then((data)=>{
  console.log(data);
  resolve(data)
})
    })
  },deletePost:(id,url)=>{
    console.log(url)
    console.log(url.substring(url.lastIndexOf('/')+1))
    let fileName=url.substring(url.lastIndexOf('/')+1) 
    return new Promise((resolve, reject) => {
      awsS3.DeleteObject(fileName).then((data)=>{
db.get().collection("post").deleteOne({_id:ObjectId(id)}).then(()=>{
resolve()
})
      })
    })

  },getPost:(id)=>{
    return new Promise((resolve, reject) => {
      db.get().collection("post").findOne({_id:ObjectId(id)}).then((data)=>{
        resolve(data)
      }) 
    })
    

  },editPost:(id,data)=>{
    return new Promise((resolve, reject) => {
      db.get()
        .collection("post")
        .updateOne({ _id: ObjectId(id) }, { $set: data })
        .then(() => {
          resolve()
        });
    });

  },editProfilePic:(id,url)=>{
    return new Promise(async(resolve, reject) => {
      db.get().collection("user").findOne({_id:ObjectId(id)}).then((userData)=>{
        if(userData.propic){
          let fileName=userData.propic.substring(userData.propic.lastIndexOf('/')+1)
          awsS3.DeleteObject(fileName)
        }
      }).then(()=>{
        db.get().collection("user").updateOne({_id:ObjectId(id)}, { $set:{propic:url}}).then(()=>{
          resolve()
        })
      })
  })
  },deletePropic:(id,url)=>{
    console.log(url.substring(url.lastIndexOf('/')+1))
    let fileName=url.substring(url.lastIndexOf('/')+1) 
    return new Promise((resolve, reject) => {
      awsS3.DeleteObject(fileName).then((data)=>{
db.get().collection("user").updateOne({_id:ObjectId(id)},{$set:{propic:undefined}}).then(()=>{
resolve()
})
      })
    })

  },removeSubscription:(id,subscription)=>{
    return new Promise((resolve, reject) => {
      db.get().collection('user').updateOne({_id:ObjectId(id)},{$pull:{subscriptions:subscription}}).then(()=>{
        resolve()
      })
    })
  },userCard: (id) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection("user")
        .findOne({ _id: ObjectId(id) })
        .then((result) => {
          db.get().collection("post").find({postedBy:ObjectId(id) }).count().then((count)=>{
            result.posts=count
            resolve(result)
          })
        });
     
    });
  },getValuationPosts:()=>{
    return new Promise((resolve, reject) => {
      db.get()
      .collection("post")
      .aggregate([
        { $match: { valuation
          :
          "true"} },
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
      .toArray().then((data)=>{
       resolve(data)
       console.log(data)
      })
    })
  }

  
};
