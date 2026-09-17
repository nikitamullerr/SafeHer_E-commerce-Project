export function passwordResetEmail(url) {
  const link = url.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return {
    text: `Reset your SafeHer password\n\nWe received a request to reset your password. Choose a new password using this link:\n${url}\n\nThis link expires in 30 minutes and can only be used once.\nIf you did not request this, you can ignore this email. Your password will stay unchanged.\n\nSafeHer | Your safety. Your people. Your choice.`,
    templateParams: {
      reset_url: url,
      reset_link: `<a href="${link}" style="display:inline-block;padding:14px 22px;border-radius:6px;background:#713650;color:#ffffff;font-weight:700;text-decoration:none;">Reset password</a>`,
      message: `Use this secure link to reset your SafeHer password: <a href="${link}">Reset password</a>. This link expires in 30 minutes.`,
    },
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Reset your SafeHer password</title></head>
<body style="margin:0;padding:0;background-color:#f7f2f5;font-family:Arial,Helvetica,sans-serif;color:#351536;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">Choose a new password for your SafeHer account. Your reset link is valid for 30 minutes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f2f5;"><tr><td align="center" style="padding:36px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e8dce3;border-radius:16px;overflow:hidden;">
<tr><td style="padding:28px 32px;background-color:#351536;border-bottom:4px solid #f1b6cf;">
<p style="margin:0;color:#ffffff;font-size:27px;font-weight:700;letter-spacing:-1px;">SafeHer</p>
<p style="margin:7px 0 0;color:#f1b6cf;font-size:12px;letter-spacing:1px;">YOUR SAFETY. YOUR PEOPLE. YOUR CHOICE.</p></td></tr>
<tr><td style="padding:32px;">
<p style="margin:0 0 12px;color:#713650;font-size:11px;font-weight:700;letter-spacing:1.5px;">ACCOUNT SECURITY</p>
<h1 style="margin:0 0 18px;color:#351536;font-size:28px;line-height:1.25;font-weight:700;">Let’s reset your password.</h1>
<p style="margin:0 0 24px;color:#655360;font-size:15px;line-height:1.7;">We received a request to reset the password for your SafeHer account. Use the button below to choose a new one.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#713650" style="border-radius:8px;text-align:center;"><a href="${link}" style="display:inline-block;padding:16px 28px;border:1px solid #713650;border-radius:8px;background-color:#713650;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;mso-padding-alt:0;"><!--[if mso]><i style="mso-font-width:200%;mso-text-raise:24pt;">&nbsp;</i><![endif]-->Reset password<!--[if mso]><i style="mso-font-width:200%;">&nbsp;</i><![endif]--></a></td></tr></table>
<p style="margin:18px 0 28px;color:#655360;font-size:13px;line-height:1.6;">Valid for <strong>30 minutes</strong>. This link can only be used once.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:16px 18px;background-color:#faf3f7;border-left:3px solid #e8a7c2;border-radius:4px;">
<p style="margin:0 0 5px;color:#351536;font-size:13px;font-weight:700;">Didn’t request this?</p><p style="margin:0;color:#655360;font-size:13px;line-height:1.6;">You can safely ignore this email. Your password will stay unchanged.</p></td></tr></table>
<p style="margin:26px 0 8px;color:#655360;font-size:12px;line-height:1.6;">If the button doesn’t work, copy and paste this link into your browser:</p>
<p style="margin:0;font-size:12px;line-height:1.7;word-break:break-all;overflow-wrap:anywhere;"><a href="${link}" style="color:#713650;text-decoration:underline;word-break:break-all;">${link}</a></p>
</td></tr></table>
<p style="max-width:480px;margin:22px auto 0;color:#786571;font-size:12px;line-height:1.7;text-align:center;">Sent by SafeHer to help you access your account.<br />Keep this email and reset link private.</p>
</td></tr></table></body></html>`
  };
}
