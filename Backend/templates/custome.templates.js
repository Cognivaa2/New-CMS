const customMailTemplate = (subject, body) => ({
  subject: subject,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      
      <div style="background-color: #1565c0; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h2 style="color: white; margin: 0;">Message from Visa Team</h2>
      </div>

      <div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        
        <div style="
          font-size: 15px;
          line-height: 1.8;
          color: #333;
          white-space: pre-line;
        ">
          ${body}
        </div>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;" />

        <p style="font-size: 12px; color: #999;">
          This is an official message from the CMS Team. Please do not reply to this email.
          If you have any questions, contact our support team.
        </p>
        <p>Best regards,</p>
        <p><strong>CMS Team</strong></p>
      </div>

    </div>
  `,
});

export default customMailTemplate;