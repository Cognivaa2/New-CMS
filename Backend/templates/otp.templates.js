const escapeHtml = (str) =>
  str.replace(/[&<>"']/g, (tag) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[tag]));
const otpTemplate = (companyName, otp, expiryMinutes) => {
  const safeName = escapeHtml(companyName);
  return {
    subject: `Verify Your Company - OTP (${expiryMinutes} min)`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color:#2c3e50;">🏗️ Construction CMS</h2>
        <h3>Hello, ${safeName} 👋</h3>
        <p>Your One-Time Password (OTP) for verification is:</p>
        <div style="font-size: 26px; font-weight: bold; margin: 20px 0; color: #2c3e50;">
          ${otp}
        </div>
        <p><strong>This OTP is valid for ${expiryMinutes} minutes.</strong></p>
        <p style="color:red;">
          ⚠️ Never share this OTP with anyone.
        </p>
        <br/>
        <p>If you did not request this, please ignore this email.</p>
        <hr/>
        <p style="font-size:12px; color:gray;">
          © ${new Date().getFullYear()} CMS. All rights reserved.
        </p>
      </div>
    `,
  };
};
export default otpTemplate;