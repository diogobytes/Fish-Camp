const express = require("express");
const mongoose = require("mongoose");
const app = express();
const path = require("path");
const Campground = require("./models/campground");
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const catchAsync = require('./utils/catchAsync');
const ExpressError = require('./utils/ExpressError');
const Joi = require('joi');
const {campgroundSchema, reviewSchema} = require('./schemas.js');
const Review = require('./models/review');
const review = require("./models/review");

mongoose.connect("mongodb://localhost:27017/fish-camp", {
  useNewUrlParser: true,
});
const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("database connected");
});
app.engine('ejs',ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended:true}))
app.use(methodOverride('_method'))



app.get('/campgrounds/new', async (req,res) => {
  res.render('campgrounds/new');
})
app.get("/campgrounds", async (req, res) => {
  const campgrounds = await Campground.find({});
  res.render("campgrounds/index", { campgrounds });
});

const validateCampground = (req,res,next) => {
    
  const {error} = campgroundSchema.validate(req.body);
  if(error){
    const msg = error.details.map(el => el.message).join(',')
      throw new ExpressError(msg, 400);
  }else {
    next();
  }
}

const validateReview = (req,res,next) => {
  const {error} = reviewSchema.validate(req.body);
   if(error){
 
    const msg = error.details.map(el => el.message).join(',')
      throw new ExpressError(msg, 400);
  }else {
    next();
  }
}


app.post('/campgrounds/:id/reviews',validateReview,catchAsync(async (req,res) => {
  const campground = await Campground.findById(req.params.id);
  const review = new Review(req.body.review);
  campground.reviews.push(review);
  await review.save();
  await campground.save();
  res.redirect(`/campgrounds/${campground._id}`);

}))



app.post('/campgrounds',validateCampground ,catchAsync(async (req,res,next) => {
  // if(!req.body.campground) throw new ExpressError('Invalid Campground Data',400);
  const campground = new Campground(req.body.campground);
  await campground.save();
  res.redirect(`/campgrounds/${campground._id}`);

}))
app.get("/campgrounds/:id", catchAsync(async (req, res) => {
  const campground = await Campground.findById(req.params.id).populate('reviews');
  console.log(campground)
  res.render("campgrounds/show", { campground });
}));

app.get('/campgrounds/:id/edit', catchAsync(async (req,res)=> {
    const campground = await Campground.findById(req.params.id);
     res.render("campgrounds/edit", { campground });
}))


app.get("/makecampground", catchAsync(async (req, res) => {
  const campground = new Campground({ title: "My Backyard" });
  await campground.save();
  res.send(campground);
}));

app.delete('/campgrounds/:id/reviews/:reviewId',catchAsync( async (req,res) => {
  const{id,reviewId} = req.params;
  Campground.findByIdAndUpdate(id, {$pull:{reviews: reviewId}})
  await Review.findByIdAndDelete(reviewId);
  res.redirect(`/campgrounds/${id}`)

}))

app.put('/campgrounds/:id', validateCampground,catchAsync(async(req,res) => {
  const {id} = req.params;
  const campground = await Campground.findByIdAndUpdate(id,{...req.body.campground});
  res.redirect(`/campgrounds/${campground._id}`);
}))


app.delete('/campgrounds/:id',catchAsync(async (req,res)=> {
  const {id} = req.params;
  await Campground.findByIdAndDelete(id);
  res.redirect('/campgrounds')
}))


app.all('*',(req,res,next) => {
  next(new ExpressError('Page Not Found',404))
})

app.use((err,req,res,next)=> {
  const {statusCode = 500} = err;
  if(!err.message) err.message = 'Oh No, Something Went Wrong!';
  res.status(statusCode).render('error',{err})
})

app.listen(3000, () => {
  console.log("PORT 3000 OPEN");
});
