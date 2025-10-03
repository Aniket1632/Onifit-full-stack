import express from 'express'
import {placeOrder, placeOrderPhonePe, placeOrderRazorpay, allOrders, userOrders, updateStatus, verifyPhonePe, verifyRazorpay} from '../controllers/orderController.js'
import adminAuth  from '../middleware/adminAuth.js'
import authUser from '../middleware/auth.js'

const orderRouter = express.Router()

// Admin Features
orderRouter.post('/list',adminAuth,allOrders)
orderRouter.post('/status',adminAuth,updateStatus)

// Payment Features
orderRouter.post('/place',authUser,placeOrder)
// orderRouter.post('/stripe',authUser,placeOrderStripe)
orderRouter.post('/razorpay', authUser, placeOrderRazorpay)
orderRouter.post('/phonepe', authUser, placeOrderPhonePe)

// User Feature 
orderRouter.post('/userorders',authUser,userOrders)

// verify payment
// orderRouter.post('/verifyStripe',authUser, verifyStripe)
orderRouter.post('/verifyRazorpay', authUser, verifyRazorpay)
orderRouter.post('/verifyPhonePe', authUser, verifyPhonePe)

export default orderRouter