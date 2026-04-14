require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// Create checkout session + save application
app.post('/create-checkout-session', upload.fields([{name: 'idFile'}, {name: 'incomeFile'}]), async (req, res) => {
    try {
        const { fullName, email, phone, dob, ssn, income, occupants, rentalHistory, pets, comments } = req.body;

        // Save application data
        const application = {
            timestamp: new Date().toISOString(),
            fullName,
            email,
            phone,
            dob,
            income,
            occupants,
            rentalHistory,
            pets,
            comments
        };

        const dataPath = path.join(__dirname, 'applications.json');
        let apps = [];
        if (fs.existsSync(dataPath)) {
            apps = JSON.parse(fs.readFileSync(dataPath));
        }
        apps.push(application);
        fs.writeFileSync(dataPath, JSON.stringify(apps, null, 2));

        // Create Stripe payment session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: 'Rental Application Screening Fee' },
                    unit_amount: 4500,  // $45.00
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${req.headers.origin}/success.html`,
            cancel_url: `${req.headers.origin}/cancel.html`,
            customer_email: email,
            metadata: { applicantName: fullName }
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});