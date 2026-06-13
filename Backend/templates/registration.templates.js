const registrationTemplate = (name) => ({
  subject: 'Welcome! Registration Successful',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2>Welcome, ${name}! 🎉</h2>
      <p>Your account has been successfully created.</p>
      <p>You can now log in and start your Company Set-Up.</p>
      <br/>
      <p>Best regards,</p>
      <p><strong>CMS Team</strong></p>
    </div>
  `,
});

export default registrationTemplate