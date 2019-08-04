const path = require("path");
const fs = require("fs");
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const formidable = require("express-formidable");

//const cloudinary = require("cloudinary");
const multer  = require('multer');

//Multer fileuploader configuration
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

//Multer file filter
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

//Ready to use multer middleware
const useMulter = multer({ storage: fileStorage, fileFilter: fileFilter }).single('file');

const app = express();
require("dotenv").config();
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true });
mongoose.set('useFindAndModify', false);

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cookieParser());

//Images store
// cloudinary.config({
//   cloud_name: process.env.CLOUD_NAME,
//   api_key: process.env.CLOUD_API_KEY,
//   api_secret: process.env.CLOUD_API_SECRET,
// })

///////////
// MODELS//
///////////
const {User} = require("./models/user");
const {Brands} = require("./models/brands");
const {Woods} = require("./models/woods");
const {Products} = require("./models/products");
const {Orders} = require("./models/orders");
const {SiteInfo} = require("./models/site");

///////////////
//MIDDLEWARES//
//////////////

const {auth} = require("./middleware/auth");
const {admin} = require("./middleware/admin");

//Email settings
const {sendEmail} = require("./utils/mail/index");

//Static folder
//app.use("/images", express.static(path.join(__dirname, "images")));

///////////////
// SITE INFO //
///////////////

//Update site data
app.post("/api/site/update_site_data", auth, admin, (req, res) => {
  const data = req.body;
  const id = req.query.id;

  SiteInfo.findOneAndUpdate({"_id":id}, {$set:{...data}}, {new: true})
  .then(newInfo => {
    return res.status(200).json({
      success: true,
      message: "Site data has been updated",
      newInfo
    });
  })
  .catch(err => {
    if(err) return res.status(400).json({err});
  })
})

//Get site info from db
app.get("/api/site/get_site_info", (req, res) => {

  SiteInfo.find({})
  .then(info => {
    if(info.length > 0) return res.status(200).json({siteInfo:info[0]});
    return res.status(200).json({siteInfo: {}})
  })
  .catch(err => {
    if(err) return response.status(400).json({err});
  })
})

//Create site data in db
app.post("/api/site/create_site_data", auth, admin, (req, res) => {
  const data = req.body;

  const siteInfo = new SiteInfo(data);
  siteInfo.save()
  .then(site => {
    return res.status(200).json({
      success: true,
      message: "Site info has been added"
    })
  })
})

//////////////
// PRODUCTS //
//////////////

//Save products concerning DB Schema
app.post("/api/products/article", auth, admin, (req, res) => {
  const products = new Products(req.body);

  products.save((err, doc) => {
    if(err) return res.json({addProductSuccess: false, err});
    res.status(200).json({
      addProductSuccess: true,
      product: doc
    })
  })
});

//Update product in DB
app.post("/api/products/update_article", auth, admin, (req, res) => {
  const data = req.body;
  const productId = req.query.id;

  Products.findOneAndUpdate({_id: productId}, {$set:{...data}}, {new: true})
  .then(product => {
    if(product){
      return res.status(200).json({
        updateProductSuccess: true,
        updatedProduct: product
      })
    }
  })
});

//Get product(s) by id
app.get("/api/products/article_by_id", (req, res) => {
  let type = req.query.type;
  let items = req.query.id;

  if(type === "array"){
    let ids = req.query.id.split(",");
    items = [];
    items = ids.map(item => {
      return mongoose.Types.ObjectId(item);
    })
  }

  Products.find({"_id":{$in:items}}).populate("wood").populate("brand").exec((err, docs)=>{
    return res.status(200).send(docs);
  })
});

app.post("/api/products/search_articles", (req, res) => {
  let fieldValue = req.body.value;
  let limit = req.body.limit ? parseInt(req.body.limit) : 100000;
  let skip = req.body.skip ? parseInt(req.body.skip) : 0;
  let brandIds = [];

  Brands.find({name: {$regex: fieldValue, $options: 'i' }})
  .then(brand => {

    if(brand){
      brand.forEach(item => {
        brandIds.push(item._id)
      })
    }

      Products.find({$or:[
        {name: {$regex: fieldValue, $options: 'i' }},
        {brand:{$in: brandIds}}
      ]})
      .populate("brand")
      .skip(skip)
      .limit(limit)
      .then(products => {

        if(products) {
           res.status(200).json({
             size: products.length,
             articles: products,
             success: true
           })
         } else {
           return res.status(200).json({
                 success: false
           })
         }
      })

  })
});

//Get product(s) by id
app.post("/api/products/delete_article", (req, res) => {
  let productId = req.query.id;

  Products.findOneAndDelete({"_id": productId})
  .then(result => {
    Products.find({})
    .populate("brand")
    .then(products => {
      return res.status(200).json(products);
    })
  })
});

//Get product(s) by arrival or sell
app.get("/api/products/articles", (req,res) => {
    let sort = req.query.sortBy ? req.query.sortBy : "_id";
    let order = req.query.order ? req.query.order : "asc";
    let limit = req.query.limit ? parseInt(req.query.limit) : 100000;
    let skip = req.query.skip ? parseInt(req.query.skip) : 0;

    Products.find()
    .populate("brand")
    .populate("wood")
    .sort([[sort, order]])
    .limit(limit)
    .skip(skip)
    .exec((err, products)=>{
      if(err) return res.status(400).send(err);
      res.status(200).json({
        articles: products,
        size: products.length
      });
    })
});

app.post("/api/products/shop", (req, res) => {

  let order = req.body.order ? req.body.order : "asc";
  let sortBy = req.body.sortBy ? req.body.sortBy : "name";
  let limit = req.body.limit ? parseInt(req.body.limit, 10) : 100;
  let skip = parseInt(req.body.skip, 10);
  let filters = req.body.filters;
  let findArgs = {}


  for(let key in filters){
    if(filters[key].length > 0){
      if(key === "price"){
        findArgs[key] = {
          $gte: filters[key][0],
          $lte: filters[key][1]
        }
      } else {
        findArgs[key] = filters[key]
      }

    }
  }


  findArgs["publish"] = true;
  console.log(findArgs);

  Products.find(findArgs)
  .populate("wood")
  .populate("brand")
  .sort([[sortBy, order]])
  .skip(skip)
  .limit(limit)
  .then(product => {
    if(!product) return res.status(400).send("Product not found");

    res.json({
      "articles": product,
      "size": product.length
    })
  })
  .catch(err => {
    return res.status(400).send(err)
  })
})

///////////
// WOODS //
///////////

app.post("/api/products/woods", auth, admin, (req, res) => {
  const wood = new Woods(req.body);

  wood.save()
  .then(newWood => {
    res.status(200).json({
      addWoodSuccess: true,
      newWood
    })
  })
  .catch(err => {
    if(err) return res.json({addBrandSuccess: false, err});
  })
});

app.get("/api/products/woods", (req, res) => {
  Woods.find({}, (err, woods) => {
    if(err) return res.status(400).send(err);
    res.status(200).send(woods);
  });
});

app.get("/api/products/delete_wood", (req, res) => {
  const id = req.query.id;

  Woods.findOneAndDelete({"_id": id})
  .then(result => {
    if(result){
      return Woods.find({});
    }
  })
  .then(woods => {
    return res.status(200).json({
      woods
    })
  })
  .catch(err => {
    if(err) return res.status(400).send(err);
  })
});


////////////
// BRANDS //
////////////

app.post("/api/products/brands", auth, admin, (req, res) => {
  const brand = new Brands(req.body);

  brand.save()
  .then(newBrand => {
    res.status(200).json({
      addBrandSuccess: true,
      newBrand
    })
  })
  .catch(err => {
    if(err) return res.json({addBrandSuccess: false, err});
  })

});

app.get("/api/products/brands", (req, res) => {
  Brands.find({}, (err, brands) => {
    if(err) return res.status(400).send(err);
    res.status(200).send(brands);
  });
});

app.get("/api/products/delete_brand", (req, res) => {
  const id = req.query.id;

  Brands.findOneAndDelete({"_id": id})
  .then(result => {
    if(result){
      return Brands.find({});
    }
  })
  .then(brands => {
    return res.status(200).json({
      brands
    })
  })
  .catch(err => {
    if(err) return res.status(400).send(err);
  })
});

////////////
// ORDERS //
////////////

//Get orders
app.get("/api/orders/get_orders", auth, (req, res) => {
  let filter = {};
  const params = req.query.findBy !== "undefined" ? filter[req.query.findBy] = req.query.value : filter = {};

  Orders.find(filter)
  .sort([["createdAt", "desc"]])
  .then(orders => {
    return res.status(200).json(orders);
  })
  .catch(err => {
    if(err) return status(400).json({
      err
    })
  })

})

//Delete order
app.post("/api/orders/delete_order", auth, (req, res) => {
  const orderId = req.query.orderId;

  Orders.findOneAndDelete({"_id": orderId})
  .then(order => {

    if(order){
      //Update product quantity before delete order
      if(order.status === "process"){
        order.orderDetails.items.forEach(item => {
            Products.findOneAndUpdate({"_id": item.product._id}, {$inc:{ quantity: item.quantity}}).then(()=>null)
        })
      }
      return Orders.find({}).sort([["createdAt", "desc"]])
    }
  })
  .then(orders => {
    return res.status(200).json(orders);
  })
  .catch(err => {
    if(err) return status(400).json({
      err
    })
  })

})

//Change status
app.post("/api/orders/change_order_status", auth, (req, res) => {
  const orderId = req.query.orderId;
  const orderStatus = req.query.value;
  let products = [];

  let makeProductAction = (id, quantity) => {
      switch(orderStatus){
        case "done":
          Products.updateOne({"_id": id}, {$inc: {sold: quantity}}).then(prod => null);
        break;
        case "process":
          Products.updateOne({"_id": id}, {$inc: {quantity: -quantity}}).then(prod => null)
        break;
        case "canceled":
          Products.updateOne({"_id": id}, {$inc: { quantity: quantity}}).then(prod => null)
        break;
        default:
          null
      }
  }

  Orders.findOneAndUpdate({"_id": orderId}, {$set: {status: orderStatus}}, {new: true})
  .then(order => {

    //Get products id
    order.orderDetails.items.map(item => {
      makeProductAction(item.product._id, item.quantity);
    })


    return Orders.find({})
    .sort([["createdAt", "desc"]])
  })
  .then(orders => {
    return res.status(200).json(orders);
  })
  .catch(err => {
    if(err) return status(400).json({
      err
    })
  })

})

//Create order
app.post("/api/orders/make_order", auth, (req, res) => {

  const orders = new Orders();
  let products = [];

  User.findById(req.user._id)
  .then(user => {
    const userHistory = user.history[user.history.length - 1];

    orders.user.name = user.name;
    orders.user.lastname = user.lastname;
    orders.user.email = user.email;
    orders.orderDetails.items = userHistory.products;
    orders.orderDetails.totalPrice = userHistory.totalPrice;
    orders.orderDetails.date = userHistory.date;

    return orders.save();
  })
  .then(order => {
    return res.status(200).json(order);
  })
  .catch(err => {
    if(err) return res.status(400).json({
      err
    })
  })
})

///////////
// USERS //
///////////

//Auth route. Check user token
app.get("/api/users/auth", auth, (req, res) => {
  res.status(200).json({
    isAdmin: req.user.role === 0 ? false : true,
    isAuth: true,
    email: req.user.email,
    name: req.user.name,
    lastname: req.user.lastname,
    role: req.user.role,
    cart: req.user.cart,
    history: req.user.history
  })
});

//Find user
app.post("/api/users/find_user", (req, res) => {
  const {email} = req.body;

  User.findOne({email})
  .then(user => {

    if(!user) return res.json({
      success: false,
      user: {
        isAuth: false,
        error: true
      }
    })

    user.generateResetToken((err, user) => {
      if(err) return err;

      sendEmail(user.email, user.name, user.resetToken, "reset-password");

      return res.status(200).json({
        success: true,
        user: user
      })
    });

  })
  .catch(err => {
    if(err) return err;
  })
})

//Reset password
app.post("/api/users/reset_password", (req, res) => {
  const {password} = req.body;
  const token = req.query.token;

  User.findByResetToken(token, (err, user) => {
    if(err) return res.json({
      success: false
    });

    user.resetToken = "";
    user.resetTokenExp = "";
    user.password = password;
    user.save()
    .then(user => {
      return res.status(200).json({
        success: true
      })
    })
  })
})

//Download product image
app.post("/api/users/uploadimage", auth, admin, useMulter, (req, res) => {

  res.status(200).json({
    name: req.file.filename,
    url: req.protocol + "://" + req.hostname + ":3000" + '/' + req.file.path.replace("\\","/")
  })
})

//Delete uploaded product image
app.get("/api/users/deleteuploadedimage", auth, admin, (req, res) => {
  const fileName = req.query.id;
  const productId = req.query.productId;
  const dir = path.resolve(".") + "/images/";

  fs.unlink(path.resolve(".") + "/images/" + fileName, (err) => {
    if (err) throw err;
    return res.status(200).json({
      success: true
    })
  });

  if(productId){
    Products.findOne({_id: productId})
    .then(product => {
      const images = product.images.filter(image => {
        return image.name !== fileName;
      });

      product.images = images;
      product.save();
    })
  }

})

//Login route
app.post("/api/users/update_user_info", auth, (req, res) => {
  const newUserData = {...req.body};

  function updateUser(){
    return User.findOneAndUpdate(
      {"_id": req.user._id},
      {$set:{...newUserData}},
      {new: true}
    ).then(user => {
      return res.status(200).json({
        success: true,
        message: "User data has been updated",
        user: user
      })
    })
    .catch(err => {
      if(err) return res.status(400).json({
        err
      })
    })
  }

  User.findById(req.user._id)
  .then(user => {
    if(user.email !== newUserData.email){
      User.findOne({"email": newUserData.email})
        .then(user => {
          if(!user){
            updateUser();
          } else {
            return res.status(200).json({
              success: false,
              message: "Email has been alredy taken by another user! Please, enter a new email.",
              user: req.user
            })
          }
        })
    } else {
      updateUser();
    }
  })

});

//Register route
app.post("/api/users/register", (req, res, next) => {
  const {name, lastname, email, password} = req.body;

  User.findOne({"email": email})
  .then(userDoc => {
    if(userDoc){
      return res.json({
        registerSuccess: false,
        message: "Email has been already taken, please enter another one!"
      });
    }

    const user = new User(req.body);

    user.save()
    .then(user => {
      sendEmail(user.email, user.name, user.token, "welcome");
      return res.status(200).json({
        registerSuccess: true,
        message: "You successfuly registered!!!"
      })
    })

  })
  .catch(err => {
    console.log(err);
  });
});

//Login route
app.post("/api/users/login", (req, res) => {

  //Find user by email
  User.findOne({"email": req.body.email})
    .then(user => {
      if(!user){
        return res.json({loginSuccess: false, message: "Auth is failed, user not found!"});
      }

      //Compare passwords
      user.comparePasswords(req.body.password, (err, isMatch)=>{
        if(!isMatch) return res.json({loginSuccess: false, message: "Wrong password"});

        //Generate token
        user.generateToken((err, user) => {
          if(err) return res.status(400).send(err);

          //Save token in cookie and return json response
          res.cookie("w_auth", user.token).status(200).json({
            loginSuccess: true
          })
        })

      })
    })
});

//Logout route
app.get("/api/users/logout", auth, (req, res) => {
  User.findOneAndUpdate({_id: req.user._id}, {token: ""}, function(err, doc){
    if(err) return res.json({success: false, err});
    return res.status(200).send({
      success: true
    })
  })
});

//Add product to user cart route
app.post('/api/users/add_to_cart',auth,(req,res)=>{

    User.findOne({_id: req.user._id},(err,doc)=>{
        let duplicate = false;

        doc.cart.forEach((item)=>{
            if(item.id == req.query.product_id){
                  duplicate = true;
            }
        })

        Products.findOneAndUpdate({"_id": req.query.product_id}, {$inc:{ quantity: -1}})
        .then(() => null)

        if(duplicate){
            User.findOneAndUpdate(
                {_id: req.user._id, "cart.id":mongoose.Types.ObjectId(req.query.product_id)},
                { $inc: { "cart.$.quantity":1 } },
                { new:true },
                (err, doc)=>{
                    if(err) return res.json({success:false,err});
                    res.status(200).json(doc.cart)
                }
            )
        } else {
            User.findOneAndUpdate(
                {_id: req.user._id},
                { $push:{ cart:{
                    id: mongoose.Types.ObjectId(req.query.product_id),
                    quantity:1,
                    date: Date.now()
                } }},
                { new: true },
                (err,doc)=>{
                    if(err) return res.json({success:false,err});
                    res.status(200).json(doc.cart)
                }
            )
        }
    })
})

//Delete item from the cart
app.post("/api/users/delete_item_from_the_cart", auth, (req, res) => {
  const product = req.body.find(item => item._id === req.query.product_id)
  console.log(product)

  Products.findOneAndUpdate({"_id": product._id}, {$inc: {quantity: product.quantity}}).then(() => null);

  User.findOneAndUpdate({_id: req.user._id}, {$pull: {cart: {"id": mongoose.Types.ObjectId(req.query.product_id)}}}, {new: true})
  .then(user => {
    res.status(200).json(user.cart)
  })
  .catch(err => {
    if(err) return res.status(400).json({
      success: false,
      err
    })
  })
});

//Clear user cart
app.post("/api/users/clear_cart", auth, (req, res) => {
  const userId = req.user._id;

  User.findOneAndUpdate({"_id": userId}, {$set: {cart: []}}, {new: true})
  .then(user => {
    return res.status(200).json({
      cart: user.cart
    })
  })
})

//Make user order history
app.post("/api/users/make_user_history", auth, (req, res) => {
  const totalPrice = req.query.totalPrice;
  const userCart = [...req.user.cart];

  User.findById(req.user._id)
  .then(user => {
    let prodIds = userCart.map(prod => prod.id)
    user.cart = [];
    user.save();

    Products.find({"_id":{$in:prodIds}}, {price: 1, brand: 1, name: 1})
    .populate({
      path: "brand",
      select: "name -_id"
    })
    .then(product => {
      userCart.forEach(cartItem => {
        product.forEach(prodItem => {
          if(cartItem.id == prodItem._id.toString()){
            delete cartItem.date;
            delete cartItem.id;
            cartItem["product"] = prodItem;
            cartItem["guitarBrand"] = prodItem["brand"].name;
          }
        })
      })

      sendEmail(user.email, user.name, user.token, "purchase");

      User.findOneAndUpdate(
        {_id: req.user._id},
        {$push: {history: {products: userCart, totalPrice, date: Date.now()}}, $set:{cart:[]}},
        {new: true})
      .exec((err, doc) => {
        console.log(doc);
        return res.status(200).json({
            cart: doc.cart,
            history: doc.history
        })
      })
    })

  })
  .catch(err => {
    if(err) return res.status(400).json({
      success: false,
      err
    })
  })
});

const port = process.env.PORT || 3002;

app.listen(port, ()=>{
  console.log(`Server is running at port: ${port}`);
})
