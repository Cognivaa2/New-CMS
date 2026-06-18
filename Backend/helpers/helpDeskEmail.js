// ─── Helper: build rich HTML email for super admin ────────────────────────────
const buildHelpdeskEmailHtml = ({ ticket, company, user }) => {
    const priorityColors = {
        Low: "#22c55e",
        Medium: "#f59e0b",
        High: "#f97316",
        Critical: "#ef4444",
    };

    const statusColors = {
        Open: "#3b82f6",
        "In Progress": "#8b5cf6",
        Resolved: "#22c55e",
        Closed: "#6b7280",
    };

    const priorityColor = priorityColors[ticket.priority] || "#6b7280";
    const statusColor = statusColors[ticket.status] || "#3b82f6";

    const raisedAt = new Date(ticket.createdAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "full",
        timeStyle: "short",
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>New Helpdesk Ticket</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:32px 36px;">
              <p style="margin:0;color:#94a3b8;font-size:13px;letter-spacing:1px;text-transform:uppercase;">CMS Pioneer</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:700;">New Helpdesk Ticket</h1>
              <p style="margin:8px 0 0;color:#cbd5e1;font-size:14px;">A company has submitted a support request.</p>
            </td>
          </tr>

          <!-- Ticket Info Banner -->
          <tr>
            <td style="background:#f8fafc;padding:16px 36px;border-bottom:1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:13px;color:#64748b;font-weight:600;">TICKET NUMBER</span><br/>
                    <span style="font-size:18px;color:#1e293b;font-weight:700;">${ticket.ticketNumber}</span>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;color:#fff;background:${statusColor};">${ticket.status}</span>
                    &nbsp;
                    <span style="display:inline-block;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;color:#fff;background:${priorityColor};">${ticket.priority}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 36px;">

              <!-- Company Info -->
              <h2 style="margin:0 0 16px;font-size:16px;color:#1e293b;border-left:4px solid #3b82f6;padding-left:12px;">Company Information</h2>
              <table width="100%" cellpadding="0" cellspacing="6" style="margin-bottom:28px;">
                <tr>
                  <td width="140" style="color:#64748b;font-size:14px;">Company Name</td>
                  <td style="color:#1e293b;font-size:14px;font-weight:600;">${company.companyName}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;font-size:14px;">Company Email</td>
                  <td style="color:#1e293b;font-size:14px;">${company.email}</td>
                </tr>
                ${company.phone ? `
                <tr>
                  <td style="color:#64748b;font-size:14px;">Phone</td>
                  <td style="color:#1e293b;font-size:14px;">${company.phone}</td>
                </tr>` : ""}
              </table>

              <!-- Person Info -->
              <h2 style="margin:0 0 16px;font-size:16px;color:#1e293b;border-left:4px solid #8b5cf6;padding-left:12px;">Raised By</h2>
              <table width="100%" cellpadding="0" cellspacing="6" style="margin-bottom:28px;">
                <tr>
                  <td width="140" style="color:#64748b;font-size:14px;">Name</td>
                  <td style="color:#1e293b;font-size:14px;font-weight:600;">${user.name}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;font-size:14px;">Email</td>
                  <td style="color:#1e293b;font-size:14px;">${user.email}</td>
                </tr>
                ${user.phone ? `
                <tr>
                  <td style="color:#64748b;font-size:14px;">Phone</td>
                  <td style="color:#1e293b;font-size:14px;">${user.phone}</td>
                </tr>` : ""}
                <tr>
                  <td style="color:#64748b;font-size:14px;">Submitted At</td>
                  <td style="color:#1e293b;font-size:14px;">${raisedAt} (IST)</td>
                </tr>
              </table>

              <!-- Ticket Details -->
              <h2 style="margin:0 0 16px;font-size:16px;color:#1e293b;border-left:4px solid #f59e0b;padding-left:12px;">Ticket Details</h2>
              <table width="100%" cellpadding="0" cellspacing="6" style="margin-bottom:20px;">
                <tr>
                  <td width="140" style="color:#64748b;font-size:14px;">Category</td>
                  <td style="color:#1e293b;font-size:14px;">${ticket.category}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;font-size:14px;">Subject</td>
                  <td style="color:#1e293b;font-size:14px;font-weight:600;">${ticket.subject}</td>
                </tr>
              </table>

              <!-- Description Box -->
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:28px;">
                <p style="margin:0 0 8px;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Description</p>
                <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;white-space:pre-wrap;">${ticket.description}</p>
              </div>

              <!-- CTA -->
              <div style="text-align:center;margin-top:8px;">
                <p style="margin:0;font-size:13px;color:#94a3b8;">Please log in to the CMS Pioneer admin panel to respond to this ticket.</p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 36px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} CMS Pioneer. This is an automated notification — do not reply to this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export default buildHelpdeskEmailHtml;
