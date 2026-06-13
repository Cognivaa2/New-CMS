export const welcomeUserTemplate = ({ name, username, password, companyName }) => ({
  subject: `Welcome to ${companyName} — Your Login Credentials`,
  html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Welcome</title>
    </head>
    <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="520" cellpadding="0" cellspacing="0"
              style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;">

              <!-- Header -->
              <tr>
                <td style="background:#18181b;padding:28px 40px;">
                  <p style="margin:0;font-size:18px;font-weight:bold;color:#ffffff;">
                    ${companyName}
                  </p>
                  <p style="margin:4px 0 0;font-size:12px;color:#a1a1aa;">Construction Management System</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:32px 40px 24px;">
                  <p style="margin:0 0 6px;font-size:20px;font-weight:bold;color:#18181b;">
                    Welcome, ${name}
                  </p>
                  <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.6;">
                    Your account has been created on the ${companyName} Construction Management System.
                    Use the credentials below to log in for the first time.
                  </p>

                  <!-- Credentials box -->
                  <table width="100%" cellpadding="0" cellspacing="0"
                    style="background:#fafafa;border:1px solid #e4e4e7;border-radius:6px;margin-bottom:24px;">
                    <tr>
                      <td style="padding:20px 24px;">
                        <p style="margin:0 0 16px;font-size:11px;font-weight:bold;color:#a1a1aa;letter-spacing:0.8px;text-transform:uppercase;">
                          Your Login Credentials
                        </p>

                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding-bottom:14px;">
                              <p style="margin:0;font-size:12px;color:#71717a;">Username</p>
                              <p style="margin:3px 0 0;font-size:15px;font-weight:bold;color:#18181b;">
                                ${username}
                              </p>
                            </td>
                          </tr>
                          <tr>
                            <td style="border-top:1px solid #e4e4e7;padding:14px 0;">
                              <p style="margin:0;font-size:12px;color:#71717a;">Email</p>
                              <p style="margin:3px 0 0;font-size:15px;font-weight:bold;color:#18181b;">
                                (the email this message was sent to)
                              </p>
                            </td>
                          </tr>
                          <tr>
                            <td style="border-top:1px solid #e4e4e7;padding-top:14px;">
                              <p style="margin:0;font-size:12px;color:#71717a;">Password</p>
                              <p style="margin:3px 0 0;font-size:15px;font-weight:bold;color:#18181b;">
                                ${password}
                              </p>
                            </td>
                          </tr>
                        </table>

                        <p style="margin:16px 0 0;font-size:12px;color:#71717a;line-height:1.6;">
                          You can log in using either your <strong style="color:#18181b;">username</strong> or your
                          <strong style="color:#18181b;">email address</strong> along with the password above.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Login button -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                    <tr>
                      <td>
                        <a href="https://cms.cognivaa.com/login"
                          style="display:inline-block;padding:12px 28px;background:#18181b;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;border-radius:6px;">
                          Log In to Your Account
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Warning -->
                  <table width="100%" cellpadding="0" cellspacing="0"
                    style="background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;margin-bottom:24px;">
                    <tr>
                      <td style="padding:14px 18px;">
                        <p style="margin:0;font-size:13px;color:#9a3412;line-height:1.6;">
                          <strong>Keep this confidential.</strong> Do not share your username or password with anyone,
                          including your team members.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0;font-size:13px;color:#71717a;line-height:1.7;">
                    After logging in, you can update your password anytime from your
                    <strong style="color:#18181b;">Profile Settings</strong>.
                    We recommend changing your password on first login.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:18px 40px 24px;border-top:1px solid #f4f4f5;">
                  <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
                    This is an automated message from <strong>${companyName}</strong>'s Construction Management System.
                    If you received this by mistake, please contact your administrator.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `,
});