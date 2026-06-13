import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
console.log(process.env.SENDGRID_API_KEY)
const sendEmail = async ({ to, subject, html }) => {
  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject,
    html,
  };
  try {
    await sgMail.send(msg);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    const errorDetails = error.response?.body?.errors ? JSON.stringify(error.response.body.errors) : error.message;
    console.error('SendGrid Error Details:', errorDetails);
    throw new Error(`Email sending failed: ${errorDetails}`);
  }
};

export default sendEmail;