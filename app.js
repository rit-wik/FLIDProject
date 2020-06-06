//jshint esversion:6
require('dotenv').config()
const express=require("express");
const bodyParser=require("body-parser");
const mongoose=require("mongoose");
const ejs=require("ejs");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');


const app = express();
app.use(express.static(__dirname + '/public'));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGODB,{useNewUrlParser: true,useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);

const userSchema =new mongoose.Schema
(
  {
    firstName: { type: String, sparse: true },
    lastName: { type: String, sparse: true },
    Profession: { type: String, sparse: true },
    stateOfResidence: { type: String, sparse: true },
    mobileNumber: { type: Number, sparse: true},
    username: { type: String, sparse: true},
    Password: { type: String, sparse: true },
    cityOfResidence: { type: String, sparse: true },
    googleId:{ type: String, sparse: true },
    googleAuth:{ type: Boolean, sparse: true,default: false }
  }
);
const discussionSchema = new mongoose.Schema
(
  {
      User: userSchema,
      Discussion: String
  }
);
const questionSchema=new mongoose.Schema
(
  {
      User: userSchema,
      Question: String,
      Discussion: [discussionSchema],
      Status: String
  }
);
const storySchema=new mongoose.Schema
(
  {
      User:userSchema,
      Title: String,
      Story: String,
      Discussion:[discussionSchema],
      Status: String
  }
);

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User",userSchema);
const Question = new mongoose.model("Question",questionSchema);
const Discussion = new mongoose.model("Discussion",discussionSchema);
const Story = new mongoose.model("Story",storySchema);


passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID:process.env.CLIENT_ID,
    clientSecret:process.env.CLIENT_SECRET,
    callbackURL: "https://pure-garden-52473.herokuapp.com/auth/google/signup",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id,firstName:profile.name.givenName,lastName:profile.name.familyName,username:null}, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res)
{
    res.sendFile(__dirname+"/index.html");
}
);

app.get("/signup",function(req,res)
{
  res.render("signup",{data:""});
});




app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get("/login",function(req,res)
{
    if(req.user)
      {
        res.redirect("/login/loginHome");
      }
    else {
      res.render("login");
    }
}
);
app.get('/auth/google/signup',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
        if(req.user.googleAuth)
          {
            res.redirect("/login/loginHome");
          }
          else {
              res.render("googlesignup");
          }
  });

app.post("/createaccountgoogleuser",function(req,res)
{
var id = req.user.googleId;
 User.updateOne({googleId:req.user.googleId},{$set: {Profession:req.body.Profession,stateOfResidence:req.body.stateOfResidence,
                                                      cityOfResidence:req.body.cityOfResidence,mobileNumber:req.body.mobileNumber,googleAuth: true}},function(err)
                                                      {
                                                        if(!err)
                                                          {
                                                            res.redirect("/login/loginHome")
                                                          }
                                                        else
                                                          {
                                                            console.log(err);
                                                          }
                                                      }
                                                    );
});


app.get("/:topic",function(req,res)
{
    res.render(req.params.topic);
}
);


app.get("/login/loginHome",function(req,res)
{
    if(req.user)
      {
          if(req.user.Profession==="flidian")
          {
            res.render("promoterLogin",{user:req.user.firstName});
          }
          else if(req.user.Profession==="flidian-doc")
            {
              res.render("doctorLogin",{user:req.user.firstName});
            }
          else {
              res.render("loginHome",{user: req.user.firstName});
          }

      }
    else {
      res.render("login");
    }
}
);

app.get("/login/questions",function(req,res)
{
  Question.find({User:req.user},'Question',function(err,foundQuestions)
  {
      if(foundQuestions)
      {
        res.render("questions",{Questions:foundQuestions});
      }
      else
      {
        res.render("questions",{Questions:{}});
      }
  }
);

}
);
app.get("/login/allQuestions",function(req,res)
{
  Question.find({},'Question',function(err,foundQuestions)
  {
      if(foundQuestions)
        {
          res.render("allQuestions",{Questions:foundQuestions});
        }
      else
        {
          res.render("allQuestions",{Questions:{}});
        }
  }
);
});

app.get("/questions/:id",function(req,res)
{
  var id=req.params.id;
  Question.findOne({_id:id}, 'Question Discussion Status',function(err,foundQuestion)
  {
      if(foundQuestion)
        {
          res.render("questionpage",{Question:foundQuestion,User:req.user});
        }
  }
);

}
);

app.get("/login/onlineCounselling/gethelp",function(req,res)
{
    res.render("onlinecounsellinghelp");
}
);
app.get("/login/onlineCounselling/approvals",function(req,res)
{
      Story.find({User:req.user},'Title Status',function(err,foundStories)
      {
          if(foundStories)
          {
          res.render("approval",{Stories:foundStories})
          }
      }
    );
}
);
app.get("/login/promoter/approvals",function(req,res)
{
    Story.find({},'User Title Status',function(err,foundStories)
    {
        if(foundStories)
          {
            res.render("promoterApprovals",{Stories:foundStories});
          }
    }
  );
}
);
app.get("/login/promoter/approvals/review/:id",function(req,res)
{
    var id=req.params.id;
    Story.findOne({_id:id},'Title Story',function(err,foundStory)
    {
        if(foundStory)
        {
          res.render("storyApproval",{Story:foundStory});
        }
    }
  );
}
);
app.get("/login/onlineCounselling/storyApproval/approve/:id",function(req,res)
{
    var id=req.params.id;
    Story.updateOne({_id:id},{Status:"Approved For Doctor"},function(err)
    {
        if(!err)
          {
            res.redirect("/login/promoter/approvals");
          }
    }
  );
}
);
app.get("/login/onlineCounselling/storyApproval/reject/:id",function(req,res)
{
    var id=req.params.id;
    Story.updateOne({_id:id},{Status:"Rejected"},function(err)
    {
        if(!err)
          {
            res.redirect("/login/promoter/approvals");
          }
    }
  );
}
);
app.get("/login/onlineCounselling/storyApproval/rejectComment/:id",function(req,res)
{
    res.render("rejectcomment",{storyId:req.params.id});
}
);
app.get("/login/onlineCounselling/approvals/rejectComment/:id",function(req,res)
{
    var id = req.params.id;
    Story.findOne({_id:id},function(err,foundStory)
    {
        if(!err)
          {
            if(foundStory)
              {
                  res.render("seecomment",{Story:foundStory});
              }
          }
    }
  );
}
);
app.get("/login/doctor/approvals",function(req,res)
{
    Story.find({$or: [{Status:"Approved For Doctor"},{Status:"Approved"}]},function(err,foundStories)
    {
        if(foundStories)
          {
            res.render("doctorApproval",{Stories:foundStories});
          }
    }
  );
}
);
app.get("/login/doctor/approvals/review/:id",function(req,res)
{
    var id=req.params.id;
    Story.findOne({_id:id},function(err,foundStory)
    {
        if(foundStory)
          {
            res.render("doctorStoryPage",{Story:foundStory});
          }
    }
  );
}
);
app.get("/login/onlineCounselling/storyApproval/doctor/discussionsection/:id",function(req,res)
{
    var id=req.params.id;
    Story.findOne({_id:id},function(err,foundStory)
    {
        if(foundStory)
        {
            res.render("doctor-user-discussion",{Story:foundStory,User:req.user})
        }

    }
  );
}
);
app.get("/login/promoter/discussion",function(req,res)
{
    Question.find({},function(err,foundQuestions)
    {
        if(foundQuestions)
          {
            res.render("promoter-discussion",{Questions:foundQuestions});
          }
    }
  );
}
);
app.get("/login/promoter/discussion/reject/update/:id",function(req,res)
{
    var id = req.params.id;
    Question.updateOne({_id:id},{$set: {Status:"Rejected"}},function(err)
    {
        if(!err)
          {
              res.redirect("/questions/"+id);
          }
    }
  );
}
);
app.post("/login/onlineCounselling/storyApproval/doctorComment/update/:id",function(req,res)
{
  var id=req.params.id;
  const discussion = new Discussion
  (
    {
        User: req.user,
        Discussion: req.body.doctorComment
    }
  );
  Story.updateOne({_id:id},{$push: {Discussion:discussion},Status:"Approved"},function(err)
  {
      if(!err)
        {
          Story.findOne({_id:id},function(err,foundStory)
          {
            if(foundStory)
            {
                res.render("doctor-user-discussion",{Story:foundStory,User:req.user});
            }
          }
        );


        }
  }
);
}
);
app.post("/login/onlineCounselling/storyApproval/rejectComment/update/:id",function(req,res)
{
    var id=req.params.id;
    const discussion = new Discussion
    (
      {
          User: req.user,
          Discussion: req.body.rejectComment
      }
    );
    Story.updateOne({_id:id},{$push: {Discussion:discussion},Status:"Rejected With Comment"},function(err)
    {
        if(!err)
          {
            res.redirect("/login/promoter/approvals");
          }
    }
  );
}
);
app.post("/login/onlineCounselling/submit",function(req,res)
{
  const story = new Story
  (
    {
        User: req.user,
        Title: req.body.onlineCounsellingTitle,
        Story: req.body.onlineCounsellingStory,
        Status: "Under Consideration"
    }
  );
  story.save(function(err)
  {
      if(!err)
        {
          res.render("submit");
        }
  }
);
}
);

app.post("/login/addQuestion",function(req,res)
{
    const question = new Question
    (
      {
          User: req.user,
          Question: req.body.question,
          Status: "Approved"
      }
    );
    question.save(function(err)
    {
      if(!err)
        {
          res.redirect("/login/questions");
        }
      else {
        console.log(err);
      }
    });
}
);

app.post("/addDiscussion/:id",function(req,res)
{
    const discussion = new Discussion
    (
      {
          User: req.user,
          Discussion: req.body.discussion
      }
    );
    discussion.save(function(err)
    {
        if(!err)
          {
            var id = req.params.id;
            Question.updateOne({_id:id},{$push: {Discussion:discussion}},function(err)
            {
                if(!err)
                  {
                    res.redirect("/questions/"+req.params.id);
                  }
            }
          );
          }
    }
  );
}
);



app.post("/createaccount",function(req,res)
{
  User.findOne({username: req.body.username},function(err,foundUser)
  {
    if(foundUser)
      {
        res.render("signup",{data:"Already registered, please proceed to login page!"});
      }
    else
      {
        User.findOne({mobileNumber:req.body.mobileNumber,googleAuth:true},function(err,foundUser)
        {
          if(foundUser)
            {
              res.render("signup",{data:"Already registered, please proceed to login page!"});
            }
          else {
            User.register({firstName: req.body.firstName,
                           lastName: req.body.lastName,
                           Profession: req.body.Profession,
                           stateOfResidence: req.body.stateOfResidence,
                           mobileNumber: req.body.mobileNumber,
                           username:req.body.username,
                           cityOfResidence:req.body.cityOfResidence},req.body.password,function(err,user) {
                             if (err) {
                               console.log(err);
                             } else {
                               passport.authenticate("local")(req, res, function(){
                                    res.redirect("/login/loginHome");
                               });
                             }
                           });
          }
        }
      );
      }
  });
               });

app.post("/login",function(req,res)
{
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local",{failureFlash: "Invalid username or password"})(req, res, function(){
        res.redirect("/login/loginHome");
      });
    }
  });
});



app.post("/",function(req,res)
{
  res.sendFile(__dirname+"/index.html");
});
app.post("/signup",function(req,res)
{
  if(req.user)
  {
    res.redirect("/login/loginHome");
  } else {
  res.render("signup",{data: ""});
}
});

app.post("/logout",function(req,res)
{
  req.logout();
  res.redirect('/');
}
);



let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port,function()
{
    console.log("server has started successfully!");
}
);
