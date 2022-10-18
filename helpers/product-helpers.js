var db = require('../config/connection')
var collection = require('../config/collections')
var objectId = require('mongodb').ObjectId

module.exports = {
    addProduct: (product, cb) => {
        console.log(product);
        product.featured = false
        product.sale = true
        product.latest = false
        product.top = false
        product.review = false
        product.date = new Date().toISOString()
        // product.percentage = parseInt(((product.marketPrice - product.OurPrice) / product.marketPrice) * 100)
        product.discountAmount=parseInt((product.percentage/100)*product.marketPrice)
        product.OurPrice=parseInt(product.marketPrice-product.discountAmount)
        db.get().collection('product').insertOne(product).then((data) => {
            cb(data)
        }).catch()
    },
    addCatogory: async(category, cb) => {
        let cat = await db.get().collection(collection.CATEGORY_COLLECTION).findOne({ category: category.category })
        if(cat){
            cb(202)
        }else{
        db.get().collection(collection.CATEGORY_COLLECTION).insertOne(category).then((data) => {
            cb(data)
            
        }).catch()
        }
    },
    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
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
                    }
                }).then((response) => {
                    resolve()
                })
        })
    },
    getCategoryProducts:(catName) =>{
        return new Promise((resolve,reject)=>{
            let prods=db.get().collection(collection.PRODUCT_COLLECTION)
            .find({category:catName}).toArray()
            resolve(prods)
        })
    }
}