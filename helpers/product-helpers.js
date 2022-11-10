var db = require('../config/connection')
var collection = require('../config/collections')
var objectId = require('mongodb').ObjectId

module.exports = {
    addProduct: (product, cb) => {
        // product.featured = false
        product.date = new Date().toISOString()
        product.discountAmount = parseInt((product.percentage / 100) * product.marketPrice)
        product.OurPrice = parseInt(product.marketPrice - product.discountAmount)
        db.get().collection('product').insertOne(product).then((data) => {
            cb(data)
        }).catch()
    },
    addCatogory:  (category) => {
        return new Promise(async(resolve,reject)=>{
            let cat = await db.get().collection(collection.CATEGORY_COLLECTION).findOne({ category: category.category })
            if (cat) {
                resolve({status:false})
            } else {
                db.get().collection(collection.CATEGORY_COLLECTION).insertOne(category).then((data) => {
                    resolve(data)
    
                }).catch()
            }
        })
        
        
    },
    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().sort({
                date
                    : -1
            }).toArray()
            resolve(products)
        })
    },
    deleteProduct: (prodId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: objectId(prodId) }).then((response) => {
                resolve(response)
            })
        })
    },
    getAllCategories: () => {
        return new Promise(async (resolve, reject) => {
            let categories = await db.get().collection(collection.CATEGORY_COLLECTION).find().toArray()
            resolve(categories)
        })
    }, getProductDetails: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(proId) }).then((product) => {
                resolve(product)
            })
        })
    }, getCategoryDetails: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).findOne({ _id: objectId(proId) }).then((product) => {
                resolve(product)
            })
        })
    }, updateProduct: (proId, proDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION)
                .updateOne({ _id: objectId(proId) }, {
                    $set: {
                        productID: proDetails.productID,
                        stock: proDetails.stock,
                        productName: proDetails.productName,
                        category: proDetails.category,
                        marketPrice: proDetails.marketPrice,
                        OurPrice: proDetails.OurPrice
                    }
                }).then((response) => {
                    resolve()
                })
        })
    }, updateCategory: (catId, catDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION)
                .updateOne({ _id: objectId(catId) }, {
                    $set: {
                        category: catDetails.category,
                        description: catDetails.description,
                        Image:catDetails.Image
                    }
                }).then((response) => {
                    resolve()
                })
        })
    },
    getCategoryProducts: (catName) => {
        return new Promise((resolve, reject) => {
            let prods = db.get().collection(collection.PRODUCT_COLLECTION)
                .find({ category: catName }).toArray()
            resolve(prods)
        })
    },
    getLatestProducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().sort({
                date
                    : -1
            }).limit(8).toArray()
            resolve(products)
        })
    },
    fetchImage:(catId)=>{
        return new Promise(async(resolve,reject)=>{
            let data= await db.get().collection(collection.CATEGORY_COLLECTION).findOne({_id:objectId(catId)})
            resolve(data.Image)
        })
    },
    fetchImages:(proId)=>{
        return new Promise(async(resolve,reject)=>{
            let data= await db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(proId)})
            resolve(data.Image)
        })
    }
}