const { sendEmail } = require("../services/email.service");

const sendTestEmail = async (req, res) => {

    try {

        await sendEmail({

            to: process.env.EMAIL_USER,

            subject: "🎉 Healora Email Test",

            html: `
                <h2>Welcome to Healora</h2>

                <p>If you received this email, your email service is working correctly.</p>

                <p><b>Your Forgot Password feature is now ready to build.</b></p>

                <hr>

                <p>Healora Team ❤️</p>
            `

        });

        return res.status(200).json({

            success: true,

            message: "Test email sent successfully."

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

module.exports = {

    sendTestEmail

};