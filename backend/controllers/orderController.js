import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from 'stripe'
import razorpay from 'razorpay'
import axios from 'axios'
import crypto from 'crypto'
import { initiatePaymentPhonePe } from "../services/phonePay.js";



// global variables
const currency = 'inr'
const deliveryCharge = 10

// gateway initialize
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const razorpayInstance = new razorpay({
    key_id : process.env.RAZORPAY_KEY_ID,
    key_secret : process.env.RAZORPAY_KEY_SECRET,
})

// Placing orders using COD Method
const placeOrder = async (req,res) => {
    
    try {
        
        const { userId, items, amount, address} = req.body;

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod:"COD",
            payment:false,
            date: Date.now()
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()

        await userModel.findByIdAndUpdate(userId,{cartData:{}})

        res.json({success:true,message:"Order Placed"})


    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }

}

// Placing orders using Stripe Method
// const placeOrderStripe = async (req,res) => {
//     try {
        
//         const { userId, items, amount, address} = req.body
//         const { origin } = req.headers;

//         const orderData = {
//             userId,
//             items,
//             address,
//             amount,
//             paymentMethod:"Stripe",
//             payment:false,
//             date: Date.now()
//         }

//         const newOrder = new orderModel(orderData)
//         await newOrder.save()

//         const line_items = items.map((item) => ({
//             price_data: {
//                 currency:currency,
//                 product_data: {
//                     name:item.name
//                 },
//                 unit_amount: item.price * 100
//             },
//             quantity: item.quantity
//         }))

//         line_items.push({
//             price_data: {
//                 currency:currency,
//                 product_data: {
//                     name:'Delivery Charges'
//                 },
//                 unit_amount: deliveryCharge * 100
//             },
//             quantity: 1
//         })

//         const session = await stripe.checkout.sessions.create({
//             success_url: `${origin}/verify?success=true&orderId=${newOrder._id}`,
//             cancel_url:  `${origin}/verify?success=false&orderId=${newOrder._id}`,
//             line_items,
//             mode: 'payment',
//         })

//         res.json({success:true,session_url:session.url});

//     } catch (error) {
//         console.log(error)
//         res.json({success:false,message:error.message})
//     }
// }

// // Verify Stripe
// const verifyStripe = async (req,res) => {

//     const { orderId, success, userId } = req.body

//     try {
//         if (success === "true") {
//             await orderModel.findByIdAndUpdate(orderId, {payment:true});
//             await userModel.findByIdAndUpdate(userId, {cartData: {}})
//             res.json({success: true});
//         } else {
//             await orderModel.findByIdAndDelete(orderId)
//             res.json({success:false})
//         }
        
//     } catch (error) {
//         console.log(error)
//         res.json({success:false,message:error.message})
//     }

// }

//Place orders using PhonePay/UPI Method



// 1) initiate PhonePe payment
// const placeOrderPhonePe = async (req, res) => {
//     try {
//         const { userId, items, amount, address } = req.body;
//         const { origin } = req.headers;

//         const orderData = {
//             userId,
//             items,
//             address,
//             amount,
//             paymentMethod: "PhonePe",
//             payment: false,
//             date: Date.now()
//         };

//         const newOrder = new orderModel(orderData);
//         await newOrder.save();

//         // PhonePe payment request
//         const payload = {
//             merchantId: process.env.PHONEPE_MERCHANT_ID,
//             merchantTransactionId: newOrder._id.toString(),
//             amount: amount * 100, // in paise
//             redirectUrl: `${origin}/verify?orderId=${newOrder._id}`,
//             redirectMode: "POST",
//             callbackUrl: `${origin}/api/order/verifyPhonePe`,
//             mobileNumber: "9999999999",
//             paymentInstrument: {
//                 type: "PAY_PAGE"
//             }
//         };

//         const data = Buffer.from(JSON.stringify(payload)).toString('base64');
//         const checksum = crypto.createHash('sha256')
//             .update(data + "/pg/v1/pay" + process.env.PHONEPE_SALT_KEY)
//             .digest('hex');
//         const checksumHeader = checksum + "###" + process.env.PHONEPE_SALT_INDEX;

//         const response = await axios.post(
//             "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay",
//             { request: data },
//             { headers: { "X-VERIFY": checksumHeader, "Content-Type": "application/json" } }
//         );

//         res.json({ success: true, url: response.data.data.instrumentResponse.redirectInfo.url });

//     } catch (error) {
//         console.log(error);
//         res.json({ success: false, message: error.message });
//     }
// };

// verifyPhonePe

// const verifyPhonePe = async (req, res) => {
//     try {
//         const { orderId, success, userId } = req.body;

//         if (success === "true") {
//             await orderModel.findByIdAndUpdate(orderId, { payment: true });
//             await userModel.findByIdAndUpdate(userId, { cartData: {} });
//             res.json({ success: true, message: "Payment Successful" });
//         } else {
//             await orderModel.findByIdAndDelete(orderId);
//             res.json({ success: false, message: "Payment Failed" });
//         }
//     } catch (error) {
//         console.log(error);
//         res.json({ success: false, message: error.message });
//     }
// };


// 1) initiate PhonePe payment
const placeOrderPhonePe = async (req, res) => {
  try {
    const userId = req.user?._id || req.body.userId; // authUser middleware should have user
    const orderItems = req.body.items;
    const address = req.body.address;
    const amountInRupees = req.body.amount; // your frontend sends rupees
    const amountPaise = Math.round(amountInRupees * 100);

    // Create order in DB with pending payment
      const order = await orderModel.create({
      userId: userId,
      items: orderItems,
      address,
      amount: amountInRupees,
      paymentMethod: 'phonepe',
      payment: false,    
     date: Date.now(),
    });

    // Build merchantTransactionId unique
    const merchantTransactionId = `ONIFIT_${order._id}_${Date.now()}`;

    // callback/redirect URL on your server (PhonePe will redirect/post here)
    const redirectUrl = `${process.env.BASE_URL}/api/order/verifyPhonePe`;

    // initiate with PhonePe
    const phonepeRes = await initiatePaymentPhonePe({
      amount: amountPaise,
      merchantTransactionId,
      merchantUserId: String(userId || 'guest'),
      redirectUrl
    });

    // Return phonepeRes to frontend. Usually structure: data: { instrumentResponse: { redirectInfo: { url } } }
    return res.json({ success: true, orderId: order._id, phonepe: phonepeRes });
  } catch (err) {
    console.error('placeOrderPhonePe error', err.response?.data || err.message);
    return res.status(500).json({ success: false, message: 'PhonePe initiation failed' });
  }
};

// 2) verify PhonePe callback (redirect/callback route)
const verifyPhonePe = async (req, res) => {
  try {
    // PhonePe may send response in body (POST) or redirect with query params.
    // Inspect req.body to see what PhonePe returns in your merchant panel / sandbox.
    const payload = req.body || req.query || {};
    console.log('PhonePe callback payload:', payload);

    // Common practice: PhonePe will send a base64 encoded response or a JSON object with transaction details.
    // You must verify response signature if provided (e.g., X-VERIFY header or somesignature). Implementation depends on PhonePe docs.
    // For now, assume payload contains merchantTransactionId and status:
    const merchantTransactionId = payload?.merchantTransactionId || payload?.transactionId;
    const status = payload?.status || payload?.code || payload?.txnStatus;

    // extract order id from merchantTransactionId if we built it earlier
    // We used format ONIFIT_<orderId>_<timestamp>
    let orderId = null;
    if (merchantTransactionId && merchantTransactionId.startsWith('ONIFIT_')) {
      const parts = merchantTransactionId.split('_');
      orderId = parts[1];
    }

    // If PhonePe sends phonepeTxnId or merchantOrderId, adjust accordingly.
    if (!orderId && payload?.merchantOrderId) orderId = payload.merchantOrderId;

    // find order
    const order = await orderModel.findById(orderId);
    if (!order) {
      console.warn('Order not found for PhonePe callback:', orderId);
      return res.status(400).json({ success: false, message: 'Order not found' });
    }

    // determine success (adjust to actual payload codes)
    const isSuccess = (status === 'SUCCESS' || status === 'COMPLETED' || payload?.code === 'PAYMENT_SUCCESS');

    if (isSuccess) {
      order.paymentStatus = 'paid';
      order.paymentResponse = payload;
      await order.save();

      // now book courier pickup (Delhivery) after payment success
      try {
        const delRes = await createDelhiveryPickup(order); // make sure this service exists
        // attempt to extract tracking
        const trackingId = delRes?.shipments?.[0]?.waybill
                         || delRes?.packages?.[0]?.waybill
                         || delRes?.data?.waybill
                         || '';
        order.trackingId = trackingId;
        order.deliveryStatus = trackingId ? 'booked' : 'booking_failed';
        order.courierResponse = delRes;
        await order.save();
      } catch (dErr) {
        console.error('Delhivery booking failed after PhonePe payment', dErr?.message || dErr);
        order.deliveryStatus = 'booking_failed';
        order.courierResponse = { error: String(dErr?.message || dErr) };
        await order.save();
      }

      // redirect user / respond as required
      // If PhonePe expects us to return a web page, you can redirect to a front-end success page:
      return res.redirect(`${process.env.BASE_URL}/verify?orderId=${order._id}&status=success`);
      // or:
      // return res.json({ success: true, message: 'Payment successful', orderId: order._id });
    } else {
      order.paymentStatus = 'failed';
      order.paymentResponse = payload;
      await order.save();
      return res.redirect(`${process.env.BASE_URL}/verify?orderId=${order._id}&status=failed`);
    }
  } catch (err) {
    console.error('verifyPhonePe error', err?.response?.data || err.message);
    return res.status(500).json({ success: false, message: 'PhonePe verification failed' });
  }
};


// Placing orders using Razorpay Method
const placeOrderRazorpay = async (req,res) => {
    try {
        
        const { userId, items, amount, address} = req.body

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod:"Razorpay",
            payment:false,
            date: Date.now()
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()

        const options = {
            amount: amount * 100,
            currency: currency.toUpperCase(),
            receipt : newOrder._id.toString()
        }

        await razorpayInstance.orders.create(options, (error,order)=>{
            if (error) {
                console.log(error)
                return res.json({success:false, message: error})
            }
            res.json({success:true,order})
        })

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}

const verifyRazorpay = async (req,res) => {
    try {
        
        const { userId, razorpay_order_id  } = req.body

        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id)
        if (orderInfo.status === 'paid') {
            await orderModel.findByIdAndUpdate(orderInfo.receipt,{payment:true});
            await userModel.findByIdAndUpdate(userId,{cartData:{}})
            res.json({ success: true, message: "Payment Successful" })
        } else {
             res.json({ success: false, message: 'Payment Failed' });
        }

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}


// All Orders data for Admin Panel
const allOrders = async (req,res) => {

    try {
        
        const orders = await orderModel.find({})
        res.json({success:true,orders})

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }

}

// User Order Data For Forntend
const userOrders = async (req,res) => {
    try {
        
        const { userId } = req.body

        const orders = await orderModel.find({ userId })
        res.json({success:true,orders})

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}

// update order status from Admin Panel
const updateStatus = async (req,res) => {
    try {
        
        const { orderId, status } = req.body

        await orderModel.findByIdAndUpdate(orderId, { status })
        res.json({success:true,message:'Status Updated'})

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}

export {verifyRazorpay, verifyPhonePe ,placeOrder, placeOrderPhonePe, placeOrderRazorpay, allOrders, userOrders, updateStatus}